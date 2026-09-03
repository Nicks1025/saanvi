import { useEffect, useRef, useState, useCallback } from 'react';
import socketService from '@/services/socket.client';
import toast from 'react-hot-toast';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

export const useUnoVoice = (room, user) => {
  const [isMicMuted, setIsMicMuted] = useState(true);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [speakingPlayers, setSpeakingPlayers] = useState(new Set());
  
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({}); // { [peerId]: RTCPeerConnection }
  const audioElementsRef = useRef({}); // { [peerId]: HTMLAudioElement }

  // Initialize Local Media ONLY when the game has started
  useEffect(() => {
    let mounted = true;
    const initLocalMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        localStreamRef.current = stream;
        // Start muted
        stream.getAudioTracks().forEach(track => (track.enabled = false));
      } catch (err) {
        console.error('Failed to get local media', err);
        // Silently fail if they deny, the game still works without voice
      }
    };

    if (room?.status === 'PLAYING') {
      initLocalMedia();
    }

    return () => {
      mounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      // Cleanup all connections
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      peerConnectionsRef.current = {};
      Object.values(audioElementsRef.current).forEach(audio => {
        audio.pause();
        audio.srcObject = null;
      });
      audioElementsRef.current = {};
    };
  }, [room?.status]);

  // WebRTC Signaling Logic
  useEffect(() => {
    if (!room || !user) return;

    const createPeerConnection = (peerId) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current[peerId] = pc;

      // Add local stream tracks to PC
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.emit('webrtc:ice_candidate', { to: peerId, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        // Create audio element for incoming stream
        if (!audioElementsRef.current[peerId]) {
          const audio = new Audio();
          audio.autoplay = true;
          audioElementsRef.current[peerId] = audio;
        }
        audioElementsRef.current[peerId].srcObject = event.streams[0];
        audioElementsRef.current[peerId].muted = isSpeakerMuted;
      };

      return pc;
    };

    const handleOffer = async ({ from, offer }) => {
      const pc = createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketService.emit('webrtc:answer', { to: from, answer });
    };

    const handleAnswer = async ({ from, answer }) => {
      const pc = peerConnectionsRef.current[from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const handleIceCandidate = async ({ from, candidate }) => {
      const pc = peerConnectionsRef.current[from];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    socketService.on('webrtc:offer', handleOffer);
    socketService.on('webrtc:answer', handleAnswer);
    socketService.on('webrtc:ice_candidate', handleIceCandidate);

    return () => {
      socketService.off('webrtc:offer', handleOffer);
      socketService.off('webrtc:answer', handleAnswer);
      socketService.off('webrtc:ice_candidate', handleIceCandidate);
    };
  }, [room, user, isSpeakerMuted]);

  // When players join, if we are host or already in, we might initiate connection
  // Actually, a simpler mesh pattern: when ROOM_UPDATED happens, see if there are new peers
  useEffect(() => {
    if (!room || !user) return;
    
    room.players.forEach(async (p) => {
      if (p.id !== user.uuid && !peerConnectionsRef.current[p.id] && p.connectionStatus === 'connected') {
        // I will initiate offer to them. To prevent race conditions, only higher string id initiates
        if (user.uuid > p.id) {
          const pc = createPeerConnection(p.id);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketService.emit('webrtc:offer', { to: p.id, offer });
        }
      }
    });

    const createPeerConnection = (peerId) => {
      if (peerConnectionsRef.current[peerId]) return peerConnectionsRef.current[peerId];
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current[peerId] = pc;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.emit('webrtc:ice_candidate', { to: peerId, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        if (!audioElementsRef.current[peerId]) {
          const audio = new Audio();
          audio.autoplay = true;
          audioElementsRef.current[peerId] = audio;
        }
        audioElementsRef.current[peerId].srcObject = event.streams[0];
        audioElementsRef.current[peerId].muted = isSpeakerMuted;
      };

      return pc;
    };
  }, [room?.players]);

  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        const newMuted = !isMicMuted;
        audioTrack.enabled = !newMuted;
        setIsMicMuted(newMuted);
        socketService.emit('uno:voice_status', { roomCode: room?.code, isMuted: newMuted });
      }
    }
  }, [isMicMuted, room]);

  const toggleSpeaker = useCallback(() => {
    const newSpeakerMuted = !isSpeakerMuted;
    setIsSpeakerMuted(newSpeakerMuted);
    Object.values(audioElementsRef.current).forEach(audio => {
      audio.muted = newSpeakerMuted;
    });
  }, [isSpeakerMuted]);

  return {
    isMicMuted,
    isSpeakerMuted,
    toggleMic,
    toggleSpeaker,
    speakingPlayers, // Not fully implemented audio-level detection yet, just placeholder
  };
};

export default useUnoVoice;
