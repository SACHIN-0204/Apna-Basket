import React from "react";
import { Link } from "react-router-dom";
import InfoPage from "../components/InfoPage";

const NotFound = () => {
    return (
        <InfoPage title="Page not found" subtitle="Looks like this aisle doesn't exist." wide>
            <div className="info-body notfound">
                <div className="notfound-code">404</div>
                <p>The page you're looking for may have moved or never existed. Let's get you back to shopping.</p>
                <div className="notfound-actions">
                    <Link to="/">Go to Home</Link>
                    <Link to="/shop" className="alt">Browse the Shop</Link>
                </div>
            </div>
        </InfoPage>
    );
};

export default NotFound;
