import React, { useState, useEffect } from 'react';
import SModal from '../../../components/common/SModal';
import STextField from '../../../components/common/STextField';
import SButton from '../../../components/common/SButton';
import { chatService } from '../chat.service';
import { useAuth } from '../../../store/AuthContext';
import { toast } from 'react-hot-toast';
import { UserPlus, UserCheck, Clock } from 'lucide-react';

const ChatRequestsModal = ({ isOpen, onClose, chatRealtime }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'new'
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRequests();
      if (activeTab === 'new') searchUsers('');
    }
  }, [isOpen, activeTab]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await chatService.getRequests();
      if (res.success) setRequests(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query) => {
    setLoading(true);
    try {
      const res = await chatService.searchUsers(query, 50);
      if (res.success) {
         let filtered = res.data.data || res.data;
         if (query) {
             filtered = filtered.filter(u => u.email.toLowerCase().includes(query.toLowerCase()) || (u.display_name && u.display_name.toLowerCase().includes(query.toLowerCase())));
         }
         // Filter out self
         filtered = filtered.filter(u => u.uuid !== user.uuid);
         setUsers(filtered);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    searchUsers(val);
  };

  const sendRequest = async (receiverUuid) => {
    try {
      await chatService.sendRequest(receiverUuid);
      toast.success('Request sent!');
      loadRequests();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    }
  };

  const respondRequest = async (uuid, status) => {
    try {
      await chatService.respondRequest(uuid, status);
      if (status === 'accepted') {
        if (chatRealtime?.reloadConversations) {
          chatRealtime.reloadConversations();
        }
        toast.success(`Request accepted!`);
        onClose();
      } else {
        toast.success(`Request ${status}`);
      }
      loadRequests();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    }
  };

  return (
    <SModal isOpen={isOpen} onCancel={onClose} cancelText="Close" title="Chat Hub">
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', borderBottom: '1px solid var(--border)' }}>
         <SButton 
           color="ghost"
           style={{ padding: '8px', borderBottom: activeTab === 'requests' ? '2px solid var(--primary-color)' : 'none', fontWeight: activeTab === 'requests' ? 'bold' : 'normal', borderRadius: 0 }}
           onClick={() => setActiveTab('requests')}
         >
           Pending Requests
         </SButton>
         <SButton 
           color="ghost"
           style={{ padding: '8px', borderBottom: activeTab === 'new' ? '2px solid var(--primary-color)' : 'none', fontWeight: activeTab === 'new' ? 'bold' : 'normal', borderRadius: 0 }}
           onClick={() => setActiveTab('new')}
         >
           Find Users
         </SButton>
      </div>

      <div style={{ minHeight: '300px', maxHeight: '400px', overflowY: 'auto' }}>
         {activeTab === 'requests' && (
            <div>
               {loading && <div>Loading...</div>}
               {!loading && requests.length === 0 && <div>No pending requests.</div>}
               {requests.map(req => {
                  const isIncoming = req.receiver_uuid === user.uuid;
                  if (req.status !== 'pending') return null; // Only show pending in this tab

                  return (
                    <div key={req.uuid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid var(--border)' }}>
                       <div>
                          <div style={{fontWeight: 'bold'}}>{isIncoming ? req.sender_name || req.sender_email : req.receiver_name || req.receiver_email}</div>
                          <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{isIncoming ? 'Incoming Request' : 'Outgoing Request'}</div>
                       </div>
                       <div>
                          {isIncoming && (
                             <div style={{display: 'flex', gap: '8px'}}>
                               <SButton onClick={() => respondRequest(req.uuid, 'accepted')}>Accept</SButton>
                               <SButton onClick={() => respondRequest(req.uuid, 'rejected')} className="danger">Reject</SButton>
                             </div>
                          )}
                          {!isIncoming && (
                             <SButton onClick={() => respondRequest(req.uuid, 'cancelled')} className="danger">Cancel</SButton>
                          )}
                       </div>
                    </div>
                  );
               })}
            </div>
         )}

         {activeTab === 'new' && (
            <div>
               <STextField placeholder="Search by name or email..." value={search} onChange={handleSearch} />
               <div style={{ marginTop: '16px' }}>
                  {loading && <div>Loading...</div>}
                  {!loading && users.map(u => {
                     // Find the active request (pending or accepted) between these users
                     const existingReq = requests.find(r => 
                       (r.sender_uuid === u.uuid || r.receiver_uuid === u.uuid) &&
                       (r.status === 'pending' || r.status === 'accepted')
                     );
                     
                     const status = existingReq ? existingReq.status : null;

                     let Icon = UserPlus;
                     let color = "var(--primary-color)";
                     let title = "Send Request";
                     let onClick = () => sendRequest(u.uuid);
                     let cursor = "pointer";

                     if (status === 'pending') {
                        Icon = Clock;
                        color = "orange";
                        const isOutgoing = existingReq.sender_uuid === user.uuid;
                        if (isOutgoing) {
                           title = "Request Sent (Click to Unsend)";
                           onClick = () => respondRequest(existingReq.uuid, 'cancelled');
                           cursor = "pointer";
                        } else {
                           title = "Request Received (Check Pending Tab)";
                           onClick = undefined;
                           cursor = "default";
                        }
                     } else if (status === 'accepted') {
                        Icon = UserCheck;
                        color = "green";
                        title = "Friends";
                        onClick = undefined;
                        cursor = "default";
                     }

                     return (
                       <div key={u.uuid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid var(--border)' }}>
                         <div>
                            <div style={{fontWeight: 'bold'}}>{u.display_name || u.first_name || 'User'}</div>
                            <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{u.email}</div>
                         </div>
                         <div 
                           onClick={onClick} 
                           title={title}
                           style={{ cursor, color, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}
                         >
                           <Icon size={20} />
                         </div>
                       </div>
                     );
                  })}
               </div>
            </div>
         )}
      </div>
    </SModal>
  );
};

export default ChatRequestsModal;
