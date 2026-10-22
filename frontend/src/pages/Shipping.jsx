import React from "react";
import { Link } from "react-router-dom";
import InfoPage from "../components/InfoPage";
import { STORE } from "../config/store";

const Shipping = () => {
    return (
        <InfoPage
            title="Shipping Information"
            subtitle="How and when your Apna Basket order reaches you."
            updated={STORE.lastUpdated}
        >
            <h2>Delivery area</h2>
            <p>
                We deliver in and around Indore, Madhya Pradesh. Enter your full address at checkout. If your address is
                outside our delivery area, we'll contact you to arrange delivery or cancel the order and refund any payment.
            </p>

            <h2>Delivery time</h2>
            <p>
                We aim to deliver most orders within one to two days of confirmation. Timing can vary with the items ordered,
                weather, festivals and local conditions. We'll contact you if there's a significant delay.
            </p>

            <h2>Delivery charges</h2>
            <table className="info-table">
                <tbody>
                    <tr>
                        <th>Delivery fee</th>
                        <td>₹{STORE.deliveryFee} per order (flat)</td>
                    </tr>
                    <tr>
                        <th>Shown at</th>
                        <td>Cart and checkout, before you pay</td>
                    </tr>
                </tbody>
            </table>

            <h2>Payment on delivery or online</h2>
            <ul>
                <li><strong>Cash on Delivery:</strong> pay the delivery person when you receive your order.</li>
                <li><strong>Razorpay:</strong> pay online by UPI, card, net banking or wallet at checkout.</li>
            </ul>

            <h2>Order status</h2>
            <p>You can follow your order any time on <Link to="/myorders">My Orders</Link>:</p>
            <ol>
                <li><strong>Pending:</strong> we've received your order and are preparing it.</li>
                <li><strong>Shipped:</strong> your order is on its way.</li>
                <li><strong>Delivered:</strong> your order has reached you.</li>
            </ol>
            <p>We also send an email each time your order status changes.</p>

            <h2>When your order arrives</h2>
            <ul>
                <li>Please keep your phone reachable so the delivery person can find you.</li>
                <li>Check the items and packaging at delivery. If something is wrong, see <Link to="/returns">Returns</Link>.</li>
                <li>If no one is available to receive the order, we may attempt delivery again or contact you to reschedule.</li>
            </ul>

            <div className="info-note">
                Need help with a delivery? Call <a href={STORE.phoneHref}>{STORE.phone}</a> or visit our{" "}
                <Link to="/contact">Contact page</Link>.
            </div>
        </InfoPage>
    );
};

export default Shipping;
