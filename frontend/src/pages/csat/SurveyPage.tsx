import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { csatApi } from '../../api/csat';

const EMOJI_RATINGS = ['\uD83D\uDE21', '\uD83D\uDE1E', '\uD83D\uDE10', '\uD83D\uDE0A', '\uD83E\uDD29'];
const LABELS = ['Awful', 'Bad', 'Neutral', 'Good', 'Excellent'];

const SurveyPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    csatApi.getSurvey(token).then(res => {
      if (res.data.submittedAt) {
        setAlreadySubmitted(true);
        setSelectedRating(res.data.rating);
      }
      setLoading(false);
    }).catch(() => {
      setError('Survey not found or has expired.');
      setLoading(false);
    });
  }, [token]);

  const handleSubmit = async () => {
    if (!token || !selectedRating) return;
    try {
      await csatApi.submitSurvey(token, selectedRating, feedback || undefined);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit survey');
    }
  };

  if (loading) return <div style={ps.page}><div style={ps.card}>Loading...</div></div>;
  if (error) return <div style={ps.page}><div style={ps.card}><p style={{ color: '#dc2626' }}>{error}</p></div></div>;

  if (submitted || alreadySubmitted) {
    return (
      <div style={ps.page}>
        <div style={ps.card}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>{'\u2705'}</div>
          <h2 style={{ color: '#333', margin: '0 0 8px 0' }}>Thank you!</h2>
          <p style={{ color: '#666', fontSize: '15px' }}>
            {submitted ? 'Your feedback has been recorded.' : 'You have already submitted your feedback.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={ps.page}>
      <div style={ps.card}>
        <h2 style={{ margin: '0 0 8px 0', color: '#333' }}>How was your experience?</h2>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>
          We'd love to hear your feedback. Rate your experience below.
        </p>

        <div style={ps.ratingRow}>
          {EMOJI_RATINGS.map((emoji, i) => {
            const rating = i + 1;
            return (
              <button key={rating} onClick={() => setSelectedRating(rating)}
                style={{
                  ...ps.emojiBtn,
                  ...(selectedRating === rating ? ps.emojiBtnActive : {}),
                  transform: selectedRating === rating ? 'scale(1.2)' : 'scale(1)',
                }}>
                <span style={{ fontSize: '36px' }}>{emoji}</span>
                <span style={ps.emojiLabel}>{LABELS[i]}</span>
              </button>
            );
          })}
        </div>

        {selectedRating && (
          <div style={ps.feedbackSection}>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
              style={ps.textarea}
              placeholder="Any additional feedback? (optional)"
              rows={3} />
            <button onClick={handleSubmit} style={ps.submitBtn}>Submit Feedback</button>
          </div>
        )}
      </div>
    </div>
  );
};

const ps: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#f0f4f8', padding: '20px',
  },
  card: {
    backgroundColor: '#fff', borderRadius: '12px', padding: '40px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)', maxWidth: '520px', width: '100%',
    textAlign: 'center' as const,
  },
  ratingRow: { display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' },
  emojiBtn: {
    border: '2px solid #e5e7eb', borderRadius: '12px', padding: '12px 8px',
    cursor: 'pointer', backgroundColor: '#fff', transition: 'all 0.2s',
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '4px',
    width: '80px',
  },
  emojiBtnActive: { borderColor: '#1b72e8', backgroundColor: '#eff6ff' },
  emojiLabel: { fontSize: '11px', color: '#666' },
  feedbackSection: { marginTop: '16px' },
  textarea: {
    width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px',
    fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' as const,
    boxSizing: 'border-box' as const, marginBottom: '12px',
  },
  submitBtn: {
    padding: '12px 32px', backgroundColor: '#1b72e8', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600,
    cursor: 'pointer',
  },
};

export default SurveyPage;
