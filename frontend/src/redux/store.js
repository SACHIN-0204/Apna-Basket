import {configureStore} from '@reduxjs/toolkit';
import cartReducer from '../redux/cartSlice';
import productsReducer from "./productsSlice.js";

const store = configureStore({
    reducer: {
        cart: cartReducer,
        products: productsReducer,
    },
});

export default store;