import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
const rawAxios = axios.create();
import { chatService } from '../chat.service';
import { chatStorage } from '../chatStorage';

import { toast } from 'react-hot-toast';

export const ATTACHMENT_STATES = {
  NOT_DOWNLOADED: 'NOT_DOWNLOADED',
  DOWNLOADING: 'DOWNLOADING',
  DOWNLOADED: 'DOWNLOADED'
};

// Global map to track concurrent downloads and prevent race conditions.
// Key: attachmentUuid -> Value: { controller, progressSubscribers: Set, stateSubscribers: Set, progress: number, state: string }
const activeDownloads = new Map();

export const useAttachment = (messageUuid, attachment) => {
  const [state, setState] = useState(ATTACHMENT_STATES.NOT_DOWNLOADED);
  const [progress, setProgress] = useState(0);
  const [localUrl, setLocalUrl] = useState(null);

  const uuid = attachment?.uuid;

  useEffect(() => {
    let mounted = true;

    if (!uuid) return;

    const checkCache = async () => {
      // 1. Check if it's already an active download in memory
      if (activeDownloads.has(uuid)) {
        const ad = activeDownloads.get(uuid);
        setState(ad.state);
        setProgress(ad.progress);
        
        const stateSub = (newState) => { if (mounted) setState(newState); };
        const progSub = (newProg) => { if (mounted) setProgress(newProg); };
        
        ad.stateSubscribers.add(stateSub);
        ad.progressSubscribers.add(progSub);
        
        return () => {
          ad.stateSubscribers.delete(stateSub);
          ad.progressSubscribers.delete(progSub);
        };
      }

      // 2. Optimistic local URL
      if (attachment._localUrl) {
        setLocalUrl(attachment._localUrl);
        setState(ATTACHMENT_STATES.DOWNLOADED);
        return;
      }

      // 3. Check IndexedDB
      try {
        const hasCache = await chatStorage.attachmentExists(uuid);
        if (!mounted) return;

        if (hasCache) {
          const blob = await chatStorage.getAttachment(uuid);
          if (blob) {
            setLocalUrl(URL.createObjectURL(blob));
            setState(ATTACHMENT_STATES.DOWNLOADED);
            return;
          }
        }
        setState(ATTACHMENT_STATES.NOT_DOWNLOADED);
      } catch (err) {
        console.error('Error reading attachment storage', err);
        if (mounted) setState(ATTACHMENT_STATES.NOT_DOWNLOADED);
      }
    };

    const unsubscribePromise = checkCache();

    return () => {
      mounted = false;
      unsubscribePromise.then(unsub => {
        if (unsub) unsub();
      });
      if (localUrl && !attachment._localUrl) {
        // Free memory when unmounted
        URL.revokeObjectURL(localUrl);
      }
    };
  }, [uuid, attachment?._localUrl]);

  const updateGlobalState = (ad, newState, newProgress = null) => {
    if (newState) {
      ad.state = newState;
      ad.stateSubscribers.forEach(fn => fn(newState));
    }
    if (newProgress !== null) {
      ad.progress = newProgress;
      ad.progressSubscribers.forEach(fn => fn(newProgress));
    }
  };

  const download = useCallback(async () => {
    if (!uuid || !messageUuid) return;
    if (activeDownloads.has(uuid) || state === ATTACHMENT_STATES.DOWNLOADING || state === ATTACHMENT_STATES.DOWNLOADED) return;

    const controller = new AbortController();
    const ad = {
      controller,
      progressSubscribers: new Set(),
      stateSubscribers: new Set(),
      progress: 0,
      state: ATTACHMENT_STATES.DOWNLOADING
    };
    activeDownloads.set(uuid, ad);

    // Initial state update
    setState(ATTACHMENT_STATES.DOWNLOADING);
    setProgress(0);
    
    // Add ourselves as a subscriber immediately
    const stateSub = (s) => setState(s);
    const progSub = (p) => setProgress(p);
    ad.stateSubscribers.add(stateSub);
    ad.progressSubscribers.add(progSub);

    try {
      const res = await chatService.getDownloadUrl(messageUuid, uuid);
      const presignedUrl = res.data?.url ?? res.url;

      if (!presignedUrl) throw new Error("No download URL returned");

      const response = await rawAxios.get(presignedUrl, {
        responseType: 'blob',
        signal: controller.signal,
        onDownloadProgress: (evt) => {
          if (evt.total) {
            const p = Math.round((evt.loaded * 100) / evt.total);
            updateGlobalState(ad, null, p);
          }
        }
      });

      const blob = response.data;
      await chatStorage.saveAttachment(uuid, blob);
      
      const newLocalUrl = URL.createObjectURL(blob);
      setLocalUrl(newLocalUrl);
      
      updateGlobalState(ad, ATTACHMENT_STATES.DOWNLOADED, 100);
      activeDownloads.delete(uuid);
      return newLocalUrl;
    } catch (err) {
      if (rawAxios.isCancel(err) || err.name === 'AbortError') {
        updateGlobalState(ad, ATTACHMENT_STATES.NOT_DOWNLOADED, 0);
      } else {
        console.error("Download failed:", err);
        toast.error("Failed to download attachment. Please try again.");
        updateGlobalState(ad, ATTACHMENT_STATES.NOT_DOWNLOADED, 0);
      }
      activeDownloads.delete(uuid);
      chatStorage.deleteAttachment(uuid).catch(() => {});
    } finally {
      ad.stateSubscribers.delete(stateSub);
      ad.progressSubscribers.delete(progSub);
    }
    return null;
  }, [uuid, messageUuid, state]);

  const cancel = useCallback(() => {
    if (!uuid) return;
    const ad = activeDownloads.get(uuid);
    if (ad && ad.controller) {
      ad.controller.abort();
      activeDownloads.delete(uuid);
      setState(ATTACHMENT_STATES.NOT_DOWNLOADED);
      setProgress(0);
      chatStorage.deleteAttachment(uuid).catch(() => {});
    }
  }, [uuid]);

  return { state, progress, localUrl, download, cancel };
};
