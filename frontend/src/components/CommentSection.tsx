import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, API_URL } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { io, type Socket } from 'socket.io-client';

interface CommentAuthor {
  id: string;
  username: string;
  displayName: string | null;
}

export interface Comment {
  id: string;
  parentId: string | null;
  content: string | null;
  isDeleted: boolean;
  createdAt: string;
  author: CommentAuthor | null;
  replies: Comment[];
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CommentForm({
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  submitLabel: string;
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSubmit(content);
      setContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yorum gonderilemedi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handle} className="space-y-2">
      <textarea
        placeholder={placeholder}
        aria-label={placeholder}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
        rows={3}
        className="w-full px-3 py-2 rounded-sm bg-ink-3 border border-line text-parchment placeholder-parchment-dim text-sm outline-none focus:border-brass transition-colors"
      />
      {error && <p className="text-verdict-weak text-xs font-mono">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-1.5 rounded-sm bg-brass hover:bg-brass-light text-ink text-sm font-medium transition-colors disabled:opacity-50"
        >
          {busy ? 'gonderiliyor...' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 rounded-sm border border-line text-parchment-dim hover:text-parchment text-sm transition-colors"
          >
            iptal
          </button>
        )}
      </div>
    </form>
  );
}

function CommentItem({
  comment,
  topicId,
  onChanged,
  isReply = false,
}: {
  comment: Comment;
  topicId: string;
  onChanged: () => void;
  isReply?: boolean;
}) {
  const { user, accessToken } = useAuth();
  const [replying, setReplying] = useState(false);

  const canModerate = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  const canDelete =
    !comment.isDeleted && (canModerate || (user && comment.author?.id === user.id));

  async function remove() {
    await apiRequest(`/topics/comments/${comment.id}`, {
      method: 'DELETE',
      token: accessToken,
    });
    onChanged();
  }

  async function sendReply(content: string) {
    await apiRequest(`/topics/${topicId}/comments`, {
      method: 'POST',
      token: accessToken,
      body: { content, parentId: comment.id },
    });
    setReplying(false);
    onChanged();
  }

  return (
    <div className={isReply ? 'border-l border-line pl-4' : 'border border-line rounded-sm p-4 bg-ink-2'}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-xs text-brass">
          {comment.isDeleted
            ? '(silindi)'
            : comment.author?.displayName ?? comment.author?.username}
        </span>
        <span className="font-mono text-xs text-parchment-dim">{formatDate(comment.createdAt)}</span>
      </div>

      <p className={`text-sm leading-relaxed mt-2 ${comment.isDeleted ? 'text-parchment-dim italic' : 'text-parchment'}`}>
        {comment.isDeleted ? 'Bu yorum silindi.' : comment.content}
      </p>

      <div className="flex gap-3 mt-2">
        {!isReply && user && !comment.isDeleted && (
          <button
            type="button"
            onClick={() => setReplying((v) => !v)}
            className="font-mono text-xs text-parchment-dim hover:text-brass transition-colors"
          >
            yanitla
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={remove}
            className="font-mono text-xs text-parchment-dim hover:text-verdict-weak transition-colors"
          >
            sil
          </button>
        )}
      </div>

      {replying && (
        <div className="mt-3">
          <CommentForm
            placeholder="Yanitini yaz..."
            submitLabel="yanitla"
            onSubmit={sendReply}
            onCancel={() => setReplying(false)}
          />
        </div>
      )}

      {comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              topicId={topicId}
              onChanged={onChanged}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentSection({ topicId }: { topicId: string }) {
  const { user, accessToken } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [totalComments, setTotalComments] = useState(0);
  const [loading, setLoading] = useState(true);

  function load() {
    apiRequest<{ items: Comment[]; total: number }>(`/topics/${topicId}/comments`)
      .then((result) => {
        setComments(result.items);
        setTotalComments(result.total);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [topicId]);

  useEffect(() => {
    if (!API_URL) return;
    const socket: Socket = io(`${API_URL}/realtime`, { transports: ['websocket'] });
    socket.on('connect', () => socket.emit('topic:join', { topicId }));
    socket.on('comment:created', load);
    return () => {
      socket.emit('topic:leave', { topicId });
      socket.disconnect();
    };
  }, [topicId]);

  async function send(content: string) {
    await apiRequest(`/topics/${topicId}/comments`, {
      method: 'POST',
      token: accessToken,
      body: { content },
    });
    load();
  }

  const total = totalComments || comments.reduce((sum, c) => sum + 1 + c.replies.length, 0);

  return (
    <section className="mt-10 border-t border-line pt-8">
      <h2 className="font-display text-xl text-parchment mb-1">Tartisma</h2>
      <p className="font-mono text-xs text-parchment-dim mb-5">{total} yorum</p>

      {user ? (
        <div className="mb-6">
          <CommentForm placeholder="Yorumunu yaz..." submitLabel="gonder" onSubmit={send} />
        </div>
      ) : (
        <Link
          to="/login"
          className="inline-block mb-6 px-4 py-1.5 rounded-sm border border-brass text-brass hover:bg-ink-2 text-sm transition-colors"
        >
          yorum yapmak icin giris yap
        </Link>
      )}

      {loading && <p className="text-parchment-dim text-sm">yukleniyor...</p>}

      {!loading && comments.length === 0 && (
        <p className="text-parchment-dim text-sm">henuz yorum yok. ilk yorumu sen yaz.</p>
      )}

      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            topicId={topicId}
            onChanged={load}
          />
        ))}
      </div>
    </section>
  );
}
