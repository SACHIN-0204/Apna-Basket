import React from "react";
import { Link } from "react-router-dom";
import InfoPage from "../components/InfoPage";
import { STORE } from "../config/store";

const Terms = () => {
    return (
        <InfoPage
            title="Terms & Conditions"
            subtitle="The ground rules for shopping with Apna Basket."
            updated={STORE.lastUpdated}
        >
            <p>
                By creating an account or placing an order on this website, you agree to these terms. Please read them
                along with our <Link to="/privacy">Privacy Policy</Link>, <Link to="/shipping">Shipping Information</Link> and{" "}
                <Link to="/returns">Returns policy</Link>.
            </p>

            <h2>1. Your account</h2>
            <ul>
                <li>You must give accurate details and verify your email with the OTP we send.</li>
                <li>You are responsible for keeping your password safe and for activity on your account.</li>
                <li>Please tell us right away if you think someone else is using your account.</li>
            </ul>

            <h2>2. Products and prices</h2>
            <ul>
                <li>All prices are in Indian Rupees (₹). Prices and availability may change without notice.</li>
                <li>We try to show accurate descriptions and images, but packaging, brands and weights may vary slightly.</li>
                <li>If a price or listing is clearly an error, we may correct it or cancel the affected order and refund you.</li>
            </ul>

            <h2>3. Orders</h2>
            <ul>
                <li>Placing an order is an offer to buy. We confirm it by email once it's accepted.</li>
                <li>Items are subject to stock. If something is unavailable we'll contact you, and may cancel or adjust the order.</li>
                <li>We may refuse or cancel orders for suspected fraud, misuse, or addresses we cannot deliver to.</li>
            </ul>

            <h2>4. Payments</h2>
            <ul>
                <li>You can pay by Cash on Delivery or online through Razorpay.</li>
                <li>A delivery fee of ₹{STORE.deliveryFee} applies per order, as shown at checkout.</li>
                <li>Online payments are processed by Razorpay and are subject to its terms. We do not store your card or bank details.</li>
            </ul>

            <h2>5. Student discount</h2>
            <p>
                Eligible students get {STORE.studentDiscountPercent}% off the cart value at checkout using a valid student email.
                We may verify eligibility. We may cancel orders or withdraw the discount if it was claimed incorrectly or misused.
            </p>

            <h2>6. Delivery, returns and cancellations</h2>
            <p>
                Delivery is described on the <Link to="/shipping">Shipping page</Link>. Replacements, refunds and cancellations are
                covered on the <Link to="/returns">Returns page</Link>.
            </p>

            <h2>7. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
                <li>Use the site for anything unlawful or fraudulent</li>
                <li>Try to break, overload or gain unauthorised access to the site or other users' accounts</li>
                <li>Copy or reuse our content, logo or brand without permission</li>
            </ul>

            <h2>8. Our responsibility</h2>
            <p>
                We work hard to keep the site and our products reliable, but the site is provided "as is". To the extent the law
                allows, our liability for any order is limited to the amount you paid for that order. Nothing in these terms
                limits your rights under Indian consumer protection law.
            </p>

            <h2>9. Changes</h2>
            <p>
                We may update these terms from time to time. The "last updated" date shows the latest version. Continuing to use
                the site after a change means you accept the updated terms.
            </p>

            <h2>10. Governing law</h2>
            <p>
                These terms are governed by the laws of India. Any dispute will be subject to the courts at Indore, Madhya Pradesh.
            </p>

            <h2>Contact</h2>
            <p>
                Questions about these terms? Email <a href={`mailto:${STORE.email}`}>{STORE.email}</a> or call{" "}
                <a href={STORE.phoneHref}>{STORE.phone}</a>.
            </p>
        </InfoPage>
    );
};

export default Terms;
