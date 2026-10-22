import React, { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import InfoPage from "../components/InfoPage";
import { STORE } from "../config/store";

const SUBJECTS = [
    "General enquiry",
    "Order status",
    "Delivery issue",
    "Return or refund",
    "Product feedback",
    "Other",
];

const MAX_MESSAGE = 2000;

const Contact = () => {
    const { user } = useContext(AuthContext);
    const [form, setForm] = useState({
        name: user?.name || "",
        email: user?.email || "",
        phone: "",
        subject: SUBJECTS[0],
        message: "",
        website: "", // honeypot - must stay empty
    });
    const [sending, setSending] = useState(false);
    const [feedback, setFeedback] = useState({ type: "", text: "" });

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFeedback({ type: "", text: "" });
        setSending(true);

        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const isJson = (res.headers.get("content-type") || "").includes("application/json");
            const data = isJson ? await res.json().catch(() => ({})) : {};

            // A non-JSON reply means the request never reached our API (e.g. server is down)
            if (!isJson) {
                throw new Error(`We couldn't reach our server. Please call ${STORE.phone} or email ${STORE.email}.`);
            }
            if (!res.ok) {
                throw new Error(data.message || "Something went wrong. Please try again.");
            }

            setFeedback({ type: "success", text: data.message || "Thank you! We'll get back to you soon." });
            setForm((prev) => ({ ...prev, phone: "", subject: SUBJECTS[0], message: "" }));
        } catch (err) {
            setFeedback({
                type: "error",
                text: err.message || `We couldn't send your message. Please call ${STORE.phone} or email ${STORE.email}.`,
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <InfoPage
            title="Contact Us"
            subtitle="Questions about an order, a product or delivery? We're happy to help."
            wide
        >
            <div className="contact-layout">
                <div className="contact-cards">
                    <div className="contact-card">
                        <div className="contact-card-icon" aria-hidden="true">📞</div>
                        <div>
                            <h3>Call us</h3>
                            <a href={STORE.phoneHref}>{STORE.phone}</a>
                        </div>
                    </div>
                    <div className="contact-card">
                        <div className="contact-card-icon" aria-hidden="true">✉️</div>
                        <div>
                            <h3>Email</h3>
                            <a href={`mailto:${STORE.email}`}>{STORE.email}</a>
                        </div>
                    </div>
                    <div className="contact-card">
                        <div className="contact-card-icon" aria-hidden="true">📍</div>
                        <div>
                            <h3>Visit us</h3>
                            <p>{STORE.address}</p>
                        </div>
                    </div>
                    <div className="contact-card">
                        <div className="contact-card-icon" aria-hidden="true">💡</div>
                        <div>
                            <h3>Quick tip</h3>
                            <p>Mention your order ID (see <Link to="/myorders">My Orders</Link>) so we can help faster.</p>
                        </div>
                    </div>
                </div>

                <div className="contact-form-card">
                    <h2>Send us a message</h2>

                    {feedback.text && (
                        <div className={`form-feedback ${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>
                            {feedback.text}
                        </div>
                    )}

                    <form className="contact-form" onSubmit={handleSubmit} noValidate={false}>
                        <div className="form-row">
                            <div className="form-field">
                                <label htmlFor="name">Your name *</label>
                                <input id="name" name="name" value={form.name} onChange={handleChange} maxLength={100} required />
                            </div>
                            <div className="form-field">
                                <label htmlFor="email">Email *</label>
                                <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-field">
                                <label htmlFor="phone">Phone (optional)</label>
                                <input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} maxLength={20} />
                            </div>
                            <div className="form-field">
                                <label htmlFor="subject">Subject</label>
                                <select id="subject" name="subject" value={form.subject} onChange={handleChange}>
                                    {SUBJECTS.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-field">
                            <label htmlFor="message">Message *</label>
                            <textarea
                                id="message"
                                name="message"
                                value={form.message}
                                onChange={handleChange}
                                minLength={10}
                                maxLength={MAX_MESSAGE}
                                required
                            />
                            <div className="char-count">{form.message.length}/{MAX_MESSAGE}</div>
                        </div>

                        {/* Honeypot field: hidden from people, bots fill it in */}
                        <div className="hp-field" aria-hidden="true">
                            <label htmlFor="website">Leave this empty</label>
                            <input id="website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={handleChange} />
                        </div>

                        <button type="submit" className="contact-submit" disabled={sending}>
                            {sending ? "Sending..." : "Send message"}
                        </button>
                    </form>
                </div>
            </div>
        </InfoPage>
    );
};

export default Contact;
