import React from "react";
import { Link } from "react-router-dom";
import InfoPage from "../components/InfoPage";
import { STORE } from "../config/store";

const Returns = () => {
    return (
        <InfoPage
            title="Returns, Refunds & Cancellations"
            subtitle="We want you to be happy with every order. Here's how we put things right."
            updated={STORE.lastUpdated}
        >
            <h2>When we'll replace or refund</h2>
            <p>Contact us within <strong>24 hours of delivery</strong> if you receive:</p>
            <ul>
                <li>A damaged, leaking or tampered item</li>
                <li>The wrong item, or items missing from your order</li>
                <li>An expired product, or one close to expiry that wasn't mentioned</li>
                <li>A product that is clearly not fresh or of poor quality</li>
            </ul>

            <h2>How to report a problem</h2>
            <ol>
                <li>Call <a href={STORE.phoneHref}>{STORE.phone}</a>, email <a href={`mailto:${STORE.email}`}>{STORE.email}</a> or use our <Link to="/contact">contact form</Link>.</li>
                <li>Share your order ID and a clear photo of the item and its packaging.</li>
                <li>We'll review and offer a replacement or a refund, usually within a day or two.</li>
            </ol>

            <h2>What we can't take back</h2>
            <ul>
                <li>Items that were opened, used or damaged after delivery</li>
                <li>Fresh or perishable items, unless they were delivered damaged or spoiled</li>
                <li>Personal care and hygiene items that have been opened</li>
                <li>Requests made more than 24 hours after delivery</li>
            </ul>

            <h2>Refunds</h2>
            <table className="info-table">
                <thead>
                    <tr>
                        <th>You paid by</th>
                        <th>Your refund goes to</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Razorpay (online)</td>
                        <td>Your original payment method. Timing depends on your bank or payment provider.</td>
                    </tr>
                    <tr>
                        <td>Cash on Delivery</td>
                        <td>A method we agree with you, such as UPI or bank transfer.</td>
                    </tr>
                </tbody>
            </table>

            <h2>Cancelling an order</h2>
            <p>
                To cancel, contact us as soon as possible. We can cancel an order that hasn't been shipped yet. Once it has
                shipped, we can't cancel it, but you can still report problems after delivery as described above. If we cancel
                your order, any online payment is refunded and you'll get an email confirmation.
            </p>

            <div className="info-note">
                Questions about a return? See the <Link to="/faq">FAQ</Link> or <Link to="/contact">contact us</Link>.
            </div>
        </InfoPage>
    );
};

export default Returns;
