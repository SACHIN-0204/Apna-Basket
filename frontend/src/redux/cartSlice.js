import { createSlice } from "@reduxjs/toolkit";

const loadCart = () => {
    try {
        const saved = localStorage.getItem('cartItems');
        return saved ? JSON.parse(saved) : [];
    } catch {
        return []; // corrupted storage should not crash the app
    }
};

const saveCart = (items) => localStorage.setItem('cartItems', JSON.stringify(items));

// Quantity must be a whole number, at least 1, and never above stock
const clampQty = (qty, stock) => {
    const q = Math.max(1, Math.floor(Number(qty) || 1));
    return Number.isFinite(stock) ? Math.min(q, stock) : q;
};

const initialState = {
    cartItems: loadCart(),
};

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        // SET the quantity of an item (used by the +/- buttons in the cart). Capped at stock.
        addToCart: (state, action) => {
            const item = action.payload;
            const stock = Number(item.stock);
            if (Number.isFinite(stock) && stock <= 0) return;

            const newItem = { ...item, quantity: clampQty(item.quantity, stock) };
            const index = state.cartItems.findIndex((x) => x._id === item._id);

            if (index >= 0) state.cartItems[index] = newItem;
            else state.cartItems.push(newItem);

            saveCart(state.cartItems);
        },

        // ADD to the existing quantity (used by "Add to Cart" buttons in Shop and ProductDetail)
        addItem: (state, action) => {
            const { quantity = 1, ...product } = action.payload;
            const stock = Number(product.stock);
            if (Number.isFinite(stock) && stock <= 0) return;

            const exist = state.cartItems.find((x) => x._id === product._id);

            if (exist) {
                exist.quantity = clampQty(exist.quantity + quantity, stock);
                exist.stock = product.stock; // keep the stock and price snapshot fresh
                exist.price = product.price;
            } else {
                state.cartItems.push({ ...product, quantity: clampQty(quantity, stock) });
            }

            saveCart(state.cartItems);
        },

        // Optional: fix the cart using live product data (clamp quantities, drop unavailable items)
        syncCartStock: (state, action) => {
            const products = action.payload;
            if (!Array.isArray(products) || products.length === 0) return; // never wipe the cart if the list failed to load

            const live = new Map(products.map((p) => [p._id, p]));

            state.cartItems = state.cartItems
                .map((item) => {
                    const p = live.get(item._id);
                    if (!p || p.isActive === false || p.stock <= 0) return null;
                    return {
                        ...item,
                        price: p.price,
                        mrp: p.mrp,
                        stock: p.stock,
                        quantity: Math.min(item.quantity, p.stock),
                    };
                })
                .filter(Boolean);

            saveCart(state.cartItems);
        },

        removeToCart: (state, action) => {
            state.cartItems = state.cartItems.filter((x) => x._id !== action.payload);
            saveCart(state.cartItems);
        },

        clearToCart: (state) => {
            state.cartItems = [];
            localStorage.removeItem('cartItems');
        },
    },
});

export const { addToCart, addItem, syncCartStock, removeToCart, clearToCart } = cartSlice.actions;
export default cartSlice.reducer;