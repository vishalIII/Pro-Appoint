const dummyReviews = [
  {
    id: "r1",
    author: "Aarav",
    rating: "4.8/5",
    comment: "Quick booking flow and the provider arrived exactly on time."
  },
  {
    id: "r2",
    author: "Maya",
    rating: "4.6/5",
    comment: "Service quality was great and communication updates were clear."
  },
  {
    id: "r3",
    author: "Ishaan",
    rating: "4.9/5",
    comment: "Clean interface, reliable support, and smooth payment experience."
  }
];

export default function Reviews() {
  return (
    <section className="page-block reviews-page">
      <div className="card reviews-header">
        <h1>Reviews</h1>
        <p className="reviews-meta">Public review API integration is pending. Showing curated dummy reviews.</p>
      </div>

      <div className="reviews-list">
        {dummyReviews.map((review) => (
          <article key={review.id} className="card review-card">
            <div className="review-head">
              <h3>{review.author}</h3>
              <span className="review-rating">{review.rating}</span>
            </div>
            <p>{review.comment}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
