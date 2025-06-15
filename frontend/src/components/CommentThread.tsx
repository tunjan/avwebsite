import React, { useState, useEffect, useCallback } from 'react';
import axios from '../api/axiosConfig';
import { useAppSelector } from '../hooks';

// --- Type Definitions ---
interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
}

interface CommentThreadProps {
  targetId: string;
  targetType: 'event' | 'announcement';
}

const CommentThread: React.FC<CommentThreadProps> = ({ targetId, targetType }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const user = useAppSelector(state => state.auth.user);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { [`${targetType}Id`]: targetId };
      const { data } = await axios.get('/api/comments', { params });
      setComments(data);
    } catch (error) {
      console.error(`Failed to fetch comments for ${targetType} ${targetId}`, error);
    } finally {
      setLoading(false);
    }
  }, [targetId, targetType]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const payload = {
      content: newComment,
      [`${targetType}Id`]: targetId
    };

    try {
      const { data: postedComment } = await axios.post('/api/comments', payload);
      // Add the new comment to the list instantly for a great UX
      setComments(prevComments => [...prevComments, postedComment]);
      setNewComment(''); // Clear the input box
    } catch (error) {
      alert("Failed to post comment. Please try again.");
    }
  };

  return (
    <div className="mt-8 pt-8 border-t border-gray-200">
      <h3 className="text-xl font-bold text-black mb-4">Discussion ({comments.length})</h3>
      
      {/* List of Existing Comments */}
      <div className="space-y-4 mb-6">
        {loading && <p>Loading comments...</p>}
        {!loading && comments.length === 0 && <p className="text-gray-500">No comments yet. Start the discussion!</p>}
        {comments.map((comment, index) => (
          <div key={comment.id || index} className="flex items-start space-x-3">
            <div className="flex-shrink-0 h-10 w-10 bg-gray-200 flex items-center justify-center font-bold">
              {comment.author.name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="font-semibold">{comment.author.name} <span className="text-sm font-normal text-gray-500">· {new Date(comment.createdAt).toLocaleString()}</span></p>
              <p className="text-gray-700">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Form to Add a New Comment */}
      <form onSubmit={handleSubmitComment} className="flex space-x-3 items-start">
        <div className="flex-shrink-0 h-10 w-10 bg-primary text-white flex items-center justify-center font-bold">
          {user?.name.charAt(0)}
        </div>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add your comment..."
          className="w-full p-2 border border-gray-300"
          rows={2}
        />
        <button type="submit" className="px-4 py-2 bg-primary text-white font-semibold self-start">Post</button>
      </form>
    </div>
  );
};

export default CommentThread;