
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { apiGet, apiPost } from "../api";
import Loader from "./Loader";
import ErrorBox from "./ErrorBox";
import "./ReviewModal.css";

export default function ReviewModal({ service, onClose, auth, onReviewAdded }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet(`/api/reviews?service_id=${service.service_id}`);
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [service.service_id]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      setFormError("Пожалуйста, напишите текст отзыва");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setSuccessMsg(null);

    try {
      await apiPost(
        "/api/reviews",
        {
          service_id: service.service_id,
          rating: Number(rating),
          comment: comment.trim(),
        },
        auth.token
      );
      setSuccessMsg("Ваш отзыв успешно опубликован!");
      setComment("");
      setRating(5);
      await loadReviews();
      if (onReviewAdded) onReviewAdded();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Отзывы об услуге</h3>
            <p className="service-subheading">{service.name}</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {loading && <Loader text="Загрузка отзывов..." />}
          {error && <ErrorBox message={error} />}

          {!loading && !error && (
            <div className="reviews-list-section">
              {reviews.length === 0 ? (
                <div className="no-reviews">
                  <p>Пока нет отзывов на эту услугу. Станьте первым, кто оставит свой отзыв!</p>
                </div>
              ) : (
                <div className="reviews-cards">
                  {reviews.map((r) => (
                    <div key={r.review_id} className="review-card-item">
                      <div className="review-card-header">
                        <span className="reviewer-name">👤 {r.user_name || "Клиент"}</span>
                        <span className="review-stars">
                          {"★".repeat(r.rating)}
                          {"☆".repeat(5 - r.rating)}
                        </span>
                      </div>
                      <p className="review-card-text">{r.comment}</p>
                      <small className="review-date">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString("ru-RU") : "Недавно"}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="add-review-section">
            <h4>Оставить отзыв</h4>
            {auth.user?.role === "admin" ? (
              <div className="admin-no-review-box">
                <p>Администраторы не могут оставлять отзывы к услугам.</p>
              </div>
            ) : auth.user ? (
              <form onSubmit={handleSubmitReview} className="add-review-form">
                {formError && <div className="form-alert error">{formError}</div>}
                {successMsg && <div className="form-alert success">{successMsg}</div>}

                <div className="rating-selector">
                  <label>Ваша оценка:</label>
                  <div className="stars-input">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        className={`star-btn ${rating >= star ? "active" : ""}`}
                        onClick={() => setRating(star)}
                      >
                        ★
                      </button>
                    ))}
                    <span className="rating-num-label">{rating} из 5</span>
                  </div>
                </div>

                <div className="comment-input-group">
                  <textarea
                    rows="3"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Поделитесь вашими впечатлениями об обслуживании..."
                    disabled={submitting}
                    required
                  />
                </div>

                <button type="submit" className="submit-review-btn" disabled={submitting}>
                  {submitting ? "Публикация..." : "Отправить отзыв"}
                </button>
              </form>
            ) : (
              <div className="login-to-review-box">
                <p>Отзывы могут оставлять только авторизованные клиенты.</p>
                <Link to="/login" className="login-link-btn" onClick={onClose}>
                  Войти в аккаунт
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
