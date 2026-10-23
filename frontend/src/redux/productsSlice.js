import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Adjust this URL to match your actual backend endpoint.
const API_URL = "/api/products";

export const fetchProducts = createAsyncThunk(
    "products/fetchProducts",
    async ({ page = 1, limit = 60, category = "", search = "" } = {}, { rejectWithValue }) => {
        try {
            const params = new URLSearchParams({ page: String(page), limit: String(limit) });
            if (category) params.set("category", category);
            if (search) params.set("search", search);
            const response = await fetch(`${API_URL}?${params.toString()}`);
            if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
            const data = await response.json();
            return Array.isArray(data) ? { products: data, page, limit, hasMore: false } : data;
        } catch (err) {
            return rejectWithValue(err.message);
        }
    },
    {
        condition: (_, { getState }) => {
            const state = getState().products;
            if (state?.status === "loading") return false;
            const last = state?.lastFetchedAt || 0;
            return Date.now() - last > 30000;
        },
    }
);

const productsSlice = createSlice({
    name: "products",
    initialState: {
        items: [],       // array of { id, name, category, price, ... }
        status: "idle",  // 'idle' | 'loading' | 'succeeded' | 'failed'
        error: null,
        page: 1,
        limit: 60,
        hasMore: false,
        total: 0,
        lastFetchedAt: 0,
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
                state.items = action.payload.products ?? [];
                state.page = action.payload.page ?? 1;
                state.limit = action.payload.limit ?? 60;
                state.hasMore = Boolean(action.payload.hasMore);
                state.total = action.payload.total ?? state.items.length;
                state.lastFetchedAt = Date.now();
            })
            .addCase(fetchProducts.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload ?? action.error.message;
            });
    },
});

export default productsSlice.reducer;