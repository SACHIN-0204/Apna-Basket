import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Adjust this URL to match your actual backend endpoint.
const API_URL = "/api/products";

export const fetchProducts = createAsyncThunk(
    "products/fetchProducts",
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }
            return await response.json();
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

const productsSlice = createSlice({
    name: "products",
    initialState: {
        items: [],       // array of { id, name, category, price, ... }
        status: "idle",  // 'idle' | 'loading' | 'succeeded' | 'failed'
        error: null,
    },
    reducers: {
        // Add synchronous reducers here if you ever need to update
        // products locally (e.g. after an admin edit) without refetching.
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchProducts.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchProducts.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.items = action.payload;
            })
            .addCase(fetchProducts.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload ?? action.error.message;
            });
    },
});

export default productsSlice.reducer;