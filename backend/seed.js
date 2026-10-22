require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const User = require("./models/User");
const Product = require("./models/Product");
const Order = require("./models/Order");

const seedDatabase = async () => {
    await connectDB();

    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});

    const hashedAdminPassword = await bcrypt.hash("admin123", 10);
    const hashedUserPassword = await bcrypt.hash("user123", 10);

    const adminUser = await User.create({
        username: "admin",
        email: "admin@apnabasket.com",
        password: hashedAdminPassword,
        role: "admin",
        verified: true,
    });

    const regularUser = await User.create({
        username: "user",
        email: "user@apnabasket.com",
        password: hashedUserPassword,
        role: "user",
        verified: true,
    });

    const products = await Product.create([
        // Cooking Essentials
        {
            name: "Fortune Sunflower Oil",
            description: "1L cooking oil for daily use.",
            price: 140,
            category: "Groceries",
            imageUrl: "https://www.bigbasket.com/pd/40080946/fortune-sunflower-oil-15-l-tin/",
            stock: 50,
            rating: 4.5,
            numReviews: 12,
        },
        {
            name: "Aashirvaad Atta",
            description: "Whole wheat flour for fresh rotis and chapatis.",
            price: 85,
            category: "Groceries",
            imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
            stock: 40,
            rating: 4.2,
            numReviews: 8,
        },
        {
            name: "Dettol Handwash",
            description: "Refreshing handwash for everyday hygiene.",
            price: 65,
            category: "Household",
            imageUrl: "https://images.unsplash.com/photo-1608571424352-9261b9d0e2f8?auto=format&fit=crop&w=800&q=80",
            stock: 30,
            rating: 4.7,
            numReviews: 15,
        },
         {
            name: "Grains",
            description: "everyday usable",
            price: 90,
            category: "Cooking",
            imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Dhaniyangal.jpg/960px-Dhaniyangal.jpg",
            stock: 30,
            rating: 4.7,
            numReviews: 15,
        },
        {
            name: "Fortune Sunflower Oil",
            description: "1L cooking oil for daily use.",
            price: 140,
            category: "Groceries",
            imageUrl: "https://images.unsplash.com/photo-1586201375761-8386571d8d1f?auto=format&fit=crop&w=800&q=80",
            stock: 50,
            rating: 4.5,
            numReviews: 12,
        },
        {
            name: "Aashirvaad Atta",
            description: "Whole wheat flour for fresh rotis and chapatis.",
            price: 85,
            category: "Groceries",
            imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
            stock: 40,
            rating: 4.2,
            numReviews: 8,
        },

        // Namkeen & wefers
                // Namkeen
        {
            name: "Haldiram's Aloo Bhujia",
            description: "Crispy, spicy potato noodles — a classic Indian namkeen snack.",
            price: 55,
            category: "Namkeen",
            imageUrl: "https://images.unsplash.com/photo-1633536706889-af4e8cd7f64b?auto=format&fit=crop&w=800&q=80",
            stock: 45,
            rating: 4.4,
            numReviews: 21,
        },
        {
            name: "Masala Peanut Mixture",
            description: "Roasted peanuts tossed with spicy masala and curry leaves.",
            price: 50,
            category: "Namkeen",
            imageUrl: "https://images.unsplash.com/photo-1552329822-b1e325719181?auto=format&fit=crop&w=800&q=80",
            stock: 35,
            rating: 4.3,
            numReviews: 17,
        },
        {
            name: "Moong Dal Namkeen",
            description: "Crunchy split-moong lentils, lightly salted and roasted.",
            price: 45,
            category: "Namkeen",
            imageUrl: "https://images.unsplash.com/photo-1552329822-b1e325719181?auto=format&fit=crop&w=800&q=80",
            stock: 40,
            rating: 4.2,
            numReviews: 14,
        },
        {
            name: "Chana Jor Garam",
            description: "Tangy flattened chickpeas with a zesty chaat masala kick.",
            price: 40,
            category: "Namkeen",
            imageUrl: "https://images.unsplash.com/photo-1633536706889-af4e8cd7f64b?auto=format&fit=crop&w=800&q=80",
            stock: 30,
            rating: 4.1,
            numReviews: 9,
        },
        {
            name: "Bhujia Sev Mix",
            description: "A crunchy mix of sev, peanuts, and roasted lentils.",
            price: 60,
            category: "Namkeen",
            imageUrl: "https://images.unsplash.com/photo-1633536706889-af4e8cd7f64b?auto=format&fit=crop&w=800&q=80",
            stock: 25,
            rating: 4.5,
            numReviews: 19,
        },

        // Wafers
        {
            name: "Classic Salted Potato Wafers",
            description: "Thin, crispy potato wafers with a light salted finish.",
            price: 20,
            category: "Wafers",
            imageUrl: "https://images.unsplash.com/photo-1512204231446-d520ee0a0873?auto=format&fit=crop&w=800&q=80",
            stock: 60,
            rating: 4.3,
            numReviews: 25,
        },
        {
            name: "Masala Munch Wafers",
            description: "Zesty masala-coated crunchy wafers, packed with flavor.",
            price: 20,
            category: "Wafers",
            imageUrl: "https://images.unsplash.com/photo-1515192760710-e68043d6e294?auto=format&fit=crop&w=800&q=80",
            stock: 55,
            rating: 4.4,
            numReviews: 22,
        },
        {
            name: "Spicy Treat Wafers",
            description: "Fiery red-chilli flavoured potato wafers for spice lovers.",
            price: 20,
            category: "Wafers",
            imageUrl: "https://images.unsplash.com/photo-1512204231446-d520ee0a0873?auto=format&fit=crop&w=800&q=80",
            stock: 50,
            rating: 4.2,
            numReviews: 16,
        },
        {
            name: "Mad Angles Triangle Wafers",
            description: "Triangle-shaped crunchy wafers with a tangy tomato twist.",
            price: 25,
            category: "Wafers",
            imageUrl: "https://images.unsplash.com/photo-1515192760710-e68043d6e294?auto=format&fit=crop&w=800&q=80",
            stock: 40,
            rating: 4.3,
            numReviews: 12,
        },
        {
            name: "Banana Chips (Kerala Style)",
            description: "Golden, coconut-oil fried banana chips, lightly salted.",
            price: 65,
            category: "Wafers",
            imageUrl: "https://images.unsplash.com/photo-1633536706889-af4e8cd7f64b?auto=format&fit=crop&w=800&q=80",
            stock: 30,
            rating: 4.6,
            numReviews: 28,
        },

                // Household / Cleaning
        {
            name: "Harpic Toilet Cleaner",
            description: "Powerful toilet cleaning liquid that removes tough stains and kills germs.",
            price: 85,
            category: "Household",
            imageUrl: "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=800&q=80",
            stock: 40,
            rating: 4.5,
            numReviews: 30,
        },
        {
            name: "Lizol Floor Cleaner",
            description: "Disinfectant floor cleaner that fights 99.9% germs, citrus fragrance.",
            price: 110,
            category: "Household",
            imageUrl: "https://images.unsplash.com/photo-1636708114826-9fc145f6fa49?auto=format&fit=crop&w=800&q=80",
            stock: 35,
            rating: 4.4,
            numReviews: 24,
        },
        {
            name: "Vim Dishwash Gel",
            description: "Lemon-fresh dishwashing gel that cuts through grease easily.",
            price: 95,
            category: "Household",
            imageUrl: "https://images.unsplash.com/photo-1599656333066-fc11a239eb52?auto=format&fit=crop&w=800&q=80",
            stock: 50,
            rating: 4.6,
            numReviews: 33,
        },
        {
            name: "Surf Excel Detergent Powder",
            description: "Stain-removing detergent powder for a deep, effective wash.",
            price: 150,
            category: "Household",
            imageUrl: "https://images.unsplash.com/photo-1636708114826-9fc145f6fa49?auto=format&fit=crop&w=800&q=80",
            stock: 30,
            rating: 4.5,
            numReviews: 27,
        },
        {
            name: "Dettol Antiseptic Liquid",
            description: "Trusted antiseptic disinfectant for wound care and surface cleaning.",
            price: 95,
            category: "Household",
            imageUrl: "https://images.unsplash.com/photo-1608571424352-9261b9d0e2f8?auto=format&fit=crop&w=800&q=80",
            stock: 45,
            rating: 4.7,
            numReviews: 38,
        },
        {
            name: "Colin Glass & Surface Cleaner",
            description: "Streak-free glass and surface cleaner spray for a sparkling shine.",
            price: 75,
            category: "Household",
            imageUrl: "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=800&q=80",
            stock: 28,
            rating: 4.3,
            numReviews: 15,
        },
        {
            name: "Domex Disinfectant Toilet Cleaner",
            description: "Thick bleach-based formula for deep toilet cleaning and germ protection.",
            price: 80,
            category: "Household",
            imageUrl: "https://images.unsplash.com/photo-1599656333066-fc11a239eb52?auto=format&fit=crop&w=800&q=80",
            stock: 38,
            rating: 4.2,
            numReviews: 11,
        },
        {
            name: "Exo Dishwash Bar",
            description: "Grease-cutting dishwash bar, tough on stains and gentle on hands.",
            price: 30,
            category: "Household",
            imageUrl: "https://images.unsplash.com/photo-1599656333066-fc11a239eb52?auto=format&fit=crop&w=800&q=80",
            stock: 60,
            rating: 4.4,
            numReviews: 20,
        },
        
    ]);

    await Order.create({
        user: regularUser._id,
        orderItems: [
            {
                productId: products[0]._id,
                quantity: 2,
                price: products[0].price,
            },
            {
                productId: products[2]._id,
                quantity: 1,
                price: products[2].price,
            },
        ],
        totalPrice: products[0].price * 2 + products[2].price,
        address: {
            fullName: "John Doe",
            street: "12 Main Street",
            city: "Mumbai",
            state: "Maharashtra",
            zipCode: "400001",
        },
        paymentMethod: "Cash on Delivery",
        status: "pending",
    });

    console.log("Database seeded successfully.");
    console.log(`Created admin user: ${adminUser.email}`);
    console.log(`Created regular user: ${regularUser.email}`);
    console.log(`Created ${products.length} products`);
};

seedDatabase()
    .then(() => {
        mongoose.disconnect();
    })
    .catch((error) => {
        console.error("Seed failed:", error);
        mongoose.disconnect();
        process.exit(1);
    });