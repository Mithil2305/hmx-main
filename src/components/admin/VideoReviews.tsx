import React, { useState, useEffect } from 'react';
import { Search, Eye, CheckCircle, XCircle, MessageSquare, Video } from 'lucide-react';

interface VideoReview {
  video_id: number;
  order_id: number;
  booking_id: string;
  client_id: number;
  client_name: string;
  client_email: string;
  editor_id: number;
  editor_name: string;
  pilot_id: number;
  pilot_name: string;
  drive_link: string;
  submitted_date: string;
  admin_comments: string;
  pilot_comments: string;
  editor_comments: string;
  status: string;
  submission_type: string;
  created_at: string;
  updated_at: string;
}

const VideoReviews: React.FC = () => {
  const [reviews, setReviews] = useState<VideoReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pilot' | 'editor' | 'all'>('all');
  const [selectedReview, setSelectedReview] = useState<VideoReview | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [adminComments, setAdminComments] = useState('');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/admin/video-reviews?type=all`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setReviews(data);
      } else {
        setReviews([]);
      }
      setLoading(false);
    } catch (error) {
      setError('Failed to fetch video reviews');
      setReviews([]);
      setLoading(false);
    }
  };

  const handleUpdateReview = async (videoId: number, status: string, comments?: string) => {
    try {
      console.log("Updating review:", videoId, status, comments);
      const response = await fetch(`/api/admin/video-reviews/${videoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status,
          admin_comments: comments || adminComments
        })
      });

      const data = await response.json();
      console.log("Update response:", data);

      if (response.ok) {
        setReviews(prev => prev.map(r => r.video_id === videoId ? {...r, status, admin_comments: comments || adminComments} : r));
        setShowReviewModal(false);
        setAdminComments('');
      } else {
        setError('Failed to update review');
      }
    } catch (error) {
      console.error(error);
      setError('Failed to update review');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'review_changes': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'forwarded_to_editor': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = review.booking_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.pilot_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.editor_name.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && review.submission_type === activeTab;
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Video Reviews</h1>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['pilot', 'editor', 'all'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as 'pilot' | 'editor' | 'all')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)} Submissions
                <span className="ml-2 bg-primary-100 text-primary-600 py-0.5 px-2 rounded-full text-xs">
                  {tab === 'all' ? reviews.length : reviews.filter(r => r.submission_type === tab).length}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search reviews..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border rounded-md"
          />
          <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Order ID', 'Client', 'Type', 'Submitter', 'Video Link', 'Submitted', 'Status', 'Comments', 'Actions'].map(h => (
                <th key={h} className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${h === 'Actions' ? 'text-right w-32' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredReviews.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                  <div className="text-lg font-medium mb-2">No {activeTab} submissions found</div>
                  <div className="text-sm">{activeTab === 'pilot' ? 'Pilot' : activeTab === 'editor' ? 'Editor' : ''} submissions will appear here when submitted.</div>
                </td>
              </tr>
            ) : (
              filteredReviews.map(review => (
                <tr key={review.video_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-blue-600">{review.booking_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{review.client_name}</div>
                    <div className="text-sm text-gray-500">{review.client_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      review.submission_type === 'pilot' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>{review.submission_type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {review.submission_type === 'pilot' ? review.pilot_name : review.editor_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {review.drive_link ? (
                      <a href={review.drive_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900 flex items-center">
                        <Video size={16} className="mr-1" /> View Video
                      </a>
                    ) : <span className="text-gray-500">No link</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{new Date(review.submitted_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(review.status)}`}>
                      {review.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {(review.submission_type === 'pilot' ? review.pilot_comments : review.editor_comments) && (
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          <span className="font-medium text-blue-600">{review.submission_type === 'pilot' ? 'Pilot: ' : 'Editor: '}</span>
                          {review.submission_type === 'pilot' ? review.pilot_comments : review.editor_comments}
                        </div>
                      )}
                      {review.admin_comments && (
                        <div className="text-sm text-gray-700 max-w-xs truncate">
                          <span className="font-medium text-red-600">Admin: </span>
                          {review.admin_comments}
                        </div>
                      )}
                      {!review.admin_comments && !(review.submission_type === 'pilot' ? review.pilot_comments : review.editor_comments) && (
                        <span className="text-gray-400 text-sm">No comments</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium w-32">
                    <div className="flex justify-end space-x-1">
                      <button
                        onClick={() => { setSelectedReview(review); setShowReviewModal(true); }}
                        className="text-blue-600 hover:text-blue-900"
                        title="Review"
                      >
                        <MessageSquare size={16} />
                      </button>
                      {review.submission_type === 'pilot' && review.status === 'submitted' && (
                        <button
                          onClick={() => handleUpdateReview(review.video_id, 'forwarded_to_editor')}
                          className="text-green-600 hover:text-green-900"
                          title="Forward to Editor"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      {review.submission_type === 'editor' && review.status === 'submitted' && (
                        <button
                          onClick={() => handleUpdateReview(review.video_id, 'completed')}
                          className="text-green-600 hover:text-green-900"
                          title="Approve Video"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleUpdateReview(review.video_id, 'review_changes')}
                        className="text-red-600 hover:text-red-900"
                        title="Request Changes"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showReviewModal && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">Review {selectedReview.booking_id}</h2>
              <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700">Submission Details</h3>
                <div className="mt-2 space-y-2">
                  <p><span className="font-medium">Client:</span> {selectedReview.client_name}</p>
                  <p><span className="font-medium">{selectedReview.submission_type === 'pilot' ? 'Pilot' : 'Editor'}:</span> {selectedReview.submission_type === 'pilot' ? selectedReview.pilot_name : selectedReview.editor_name}</p>
                  <p><span className="font-medium">Submitted:</span> {new Date(selectedReview.submitted_date).toLocaleString()}</p>
                  <p><span className="font-medium">Status:</span>
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(selectedReview.status)}`}>{selectedReview.status.replace('_', ' ')}</span>
                  </p>
                </div>
              </div>

              {selectedReview.drive_link && (
                <div>
                  <h3 className="font-semibold text-gray-700">Video Link</h3>
                  <a href={selectedReview.drive_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900 flex items-center mt-2">
                    <Video size={16} className="mr-2" /> View Submitted Video
                  </a>
                </div>
              )}

              {/* Comments */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Comments History</h3>
                <div className="space-y-3">
                  {selectedReview.pilot_comments && (
                    <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                      <h4 className="font-medium text-blue-800 mb-1">Pilot Comments</h4>
                      <p className="text-gray-900">{selectedReview.pilot_comments}</p>
                    </div>
                  )}
                  {selectedReview.editor_comments && (
                    <div className="bg-purple-50 p-3 rounded-lg border-l-4 border-purple-400">
                      <h4 className="font-medium text-purple-800 mb-1">Editor Comments</h4>
                      <p className="text-gray-900">{selectedReview.editor_comments}</p>
                    </div>
                  )}
                  {selectedReview.admin_comments && (
                    <div className="bg-red-50 p-3 rounded-lg border-l-4 border-red-400">
                      <h4 className="font-medium text-red-800 mb-1">Previous Admin Comments</h4>
                      <p className="text-gray-900">{selectedReview.admin_comments}</p>
                    </div>
                  )}
                  {!selectedReview.pilot_comments && !selectedReview.editor_comments && !selectedReview.admin_comments && (
                    <div className="bg-gray-50 p-3 rounded-lg text-center"><p className="text-gray-500">No comments yet</p></div>
                  )}
                </div>
              </div>

              {/* Admin Review */}
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h3 className="font-semibold text-gray-700 mb-2 flex items-center">
                  <MessageSquare size={18} className="mr-2 text-yellow-600" />
                  Add Admin Review Comments
                </h3>
                <textarea
                  value={adminComments}
                  onChange={(e) => setAdminComments(e.target.value)}
                  placeholder="Enter your review comments..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  rows={4}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button onClick={() => setShowReviewModal(false)} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
                <button onClick={() => handleUpdateReview(selectedReview.video_id, 'review_changes', adminComments)} className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700">Request Changes</button>
                {selectedReview.submission_type === 'pilot' && (
                  <button onClick={() => handleUpdateReview(selectedReview.video_id, 'forwarded_to_editor', adminComments)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Forward to Editor</button>
                )}
                {selectedReview.submission_type === 'editor' && (
                  <button onClick={() => handleUpdateReview(selectedReview.video_id, 'completed', adminComments)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Approve Video</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoReviews;
