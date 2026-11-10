import React from "react";
import { Link } from "react-router-dom";
import InfoPage from "../components/InfoPage";
import { useT } from "../i18n/LanguageContext";

const NotFound = () => {
    const { t } = useT();
    return (
        <InfoPage title={t("nf.title")} subtitle={t("nf.subtitle")} wide>
            <div className="info-body notfound">
                <div className="notfound-code">404</div>
                <p>{t("nf.text")}</p>
                <div className="notfound-actions">
                    <Link to="/">{t("nf.home")}</Link>
                    <Link to="/shop" className="alt">{t("nf.shop")}</Link>
                </div>
            </div>
        </InfoPage>
    );
};

export default NotFound;
