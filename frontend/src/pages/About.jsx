import React from "react";
import "../styles/about.css";

const About = () => {
    return (
        <div className="about-container">
            {/* Hero Section */}
            <section className="about-hero">
                <div className="hero-content">
                    <h1>About Apna Basket</h1>
                    <p>Groceries • Daily Essentials • Household Needs</p>
                    <p className="about-tagline">Quality Products | Best Value | Easy Shopping</p>
                </div>
            </section>

            {/* Mission & Vision */}
            <section className="mission-vision">
                <div className="mission-card">
                    <div className="card-icon">📍</div>
                    <h2>Our Mission</h2>
                    <p>
                        To provide fresh, high-quality grocery products at affordable prices 
                        to every household, ensuring convenience and reliability in shopping 
                        experience.
                    </p>
                </div>
                <div className="mission-card">
                    <div className="card-icon">🎯</div>
                    <h2>Our Vision</h2>
                    <p>
                        To become the most trusted and preferred online grocery basket for every home, 
                        delivering excellence through quality products and exceptional 
                        customer service.
                    </p>
                </div>
                <div className="mission-card">
                    <div className="card-icon">❤️</div>
                    <h2>Our Values</h2>
                    <p>
                        We believe in honesty, quality, and customer satisfaction. Every 
                        product is carefully selected to meet our high standards of excellence.
                    </p>
                </div>
            </section>

            {/* Why Choose Us */}
            <section className="why-choose-us">
                <h2>Why Choose Apna Basket?</h2>
                <div className="features-grid">
                    <div className="feature">
                        <div className="feature-icon">✓</div>
                        <h3>Fresh Products</h3>
                        <p>Daily sourced fresh groceries and essentials for your family</p>
                    </div>
                    <div className="feature">
                        <div className="feature-icon">✓</div>
                        <h3>Affordable Prices</h3>
                        <p>Best prices without compromising on quality standards</p>
                    </div>
                    <div className="feature">
                        <div className="feature-icon">✓</div>
                        <h3>Fast Delivery</h3>
                        <p>Quick and reliable delivery at your doorstep</p>
                    </div>
                    <div className="feature">
                        <div className="feature-icon">✓</div>
                        <h3>24/7 Support</h3>
                        <p>Round-the-clock customer support for all your queries</p>
                    </div>
                    <div className="feature">
                        <div className="feature-icon">✓</div>
                        <h3>Wide Range</h3>
                        <p>Extensive collection of products from trusted brands</p>
                    </div>
                    <div className="feature">
                        <div className="feature-icon">✓</div>
                        <h3>Safe & Secure</h3>
                        <p>Secure payment options and data protection guaranteed</p>
                    </div>
                </div>
            </section>

            {/* Statistics */}
            <section className="statistics">
                <div className="stat-card">
                    <h3>500+</h3>
                    <p>Products Available</p>
                </div>
                <div className="stat-card">
                    <h3>50K+</h3>
                    <p>Happy Customers</p>
                </div>
                <div className="stat-card">
                    <h3>100%</h3>
                    <p>Fresh Guarantee</p>
                </div>
                <div className="stat-card">
                    <h3>24/7</h3>
                    <p>Customer Support</p>
                </div>
            </section>

            {/* Our Story */}
            <section className="our-story">
                <h2>Our Story</h2>
                <div className="story-content">
                    <p>
                        Apna Basket was founded with a simple vision - to make 
                        quality groceries accessible to everyone at fair prices. What started 
                        as a small neighborhood shop has now grown into a trusted online 
                        platform serving thousands of families.
                    </p>
                    <p>
                        Over the years, we've built strong relationships with suppliers and 
                        customers alike. Our commitment to quality has never wavered, and we 
                        continue to expand our product range to serve the diverse needs of 
                        our valued customers.
                    </p>
                    <p>
                        Today, we're proud to be one of the most reliable grocery stores in 
                        the region, known for our fresh products, competitive prices, and 
                        exceptional customer service.
                    </p>
                </div>
            </section>

            {/* Team Section */}
            <section className="team-section">
                <h2>Meet Our Team</h2>
                <div className="team-grid">
                    <div className="team-member">
                        <div className="member-image">👨‍💼</div>
                        <h3>Abhishek Kumar</h3>
                        <p>Founder & CEO</p>
                    </div>
                    <div className="team-member">
                        <div className="member-image">👩‍💼</div>
                        <h3>Priya Sharma</h3>
                        <p>Operations Manager</p>
                    </div>
                    <div className="team-member">
                        <div className="member-image">👨‍💻</div>
                        <h3>Rahul Singh</h3>
                        <p>Technical Lead</p>
                    </div>
                    <div className="team-member">
                        <div className="member-image">👩‍💻</div>
                        <h3>Neha Verma</h3>
                        <p>Customer Support Head</p>
                    </div>
                </div>
            </section>

            {/* Contact CTA */}
            <section className="contact-cta">
                <h2>Have Questions?</h2>
                <p>Get in touch with our team - we're here to help!</p>
                <div className="cta-buttons">
                    <a href="/contact" className="btn btn-primary">Contact Us</a>
                    <a href="mailto:info@apnabasket.com" className="btn btn-secondary">Email Us</a>
                </div>
            </section>
        </div>
    )
};

export default About;