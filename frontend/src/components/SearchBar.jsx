import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/searchbar.css";

/**
 * SearchBar
 *
 * Props:
 *  - items: array of { id, name, category } to search over (e.g. products)
 *  - onSelect: optional callback(item) fired when a result is chosen
 *  - placeholder: optional input placeholder text
 *
 * If onSelect isn't provided, selecting a result navigates to
 * `/product/:id` by default — change that in handleSelect if your
 * routes are named differently.
 */
const SearchBar = ({ items = [], onSelect, placeholder = "Search products…" }) => {
    const [query, setQuery] = useState("");
    const [matches, setMatches] = useState([]);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const wrapRef = useRef(null);
    const navigate = useNavigate();

    const getItemId = (item) => item.id ?? item._id;
    const getItemName = (item) => item.name ?? item.title ?? "";

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const runSearch = (value) => {
        setQuery(value);
        setActiveIndex(-1);

        const trimmed = value.trim();
        if (!trimmed) {
            setMatches([]);
            setOpen(false);
            return;
        }

        const searchLower = trimmed.toLowerCase();
        const results = items
            .filter((item) => getItemName(item).toLowerCase().includes(searchLower))
            .slice(0, 8);

        setMatches(results);
        setOpen(true);
    };

    const handleSelect = (item) => {
        setQuery(getItemName(item));
        setOpen(false);
        if (onSelect) {
            onSelect(item);
        } else {
            const id = getItemId(item);
            if (id) {
                navigate(`/product/${id}`);
            }
        }
    };

    const handleKeyDown = (e) => {
        if (!open || matches.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (activeIndex >= 0) {
                handleSelect(matches[activeIndex]);
            } else if (matches.length === 1) {
                handleSelect(matches[0]);
            }
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    };

    const handleClear = () => {
        setQuery("");
        setMatches([]);
        setOpen(false);
        setActiveIndex(-1);
    };

    const highlight = (text) => {
        const queryLower = query.toLowerCase();
        const textLower = text.toLowerCase();
        const idx = textLower.indexOf(queryLower);
        if (idx === -1 || !query) return text;
        return (
            <>
                {text.slice(0, idx)}
                <mark>{text.slice(idx, idx + query.length)}</mark>
                {text.slice(idx + query.length)}
            </>
        );
    };

    return (
        <div className="searchbar-wrap" ref={wrapRef}>
            <div className="searchbar-field">
                <svg className="searchbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => runSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => query.trim() && setOpen(true)}
                    placeholder={placeholder}
                    autoComplete="off"
                    aria-label="Search"
                />
                {query && (
                    <button className="searchbar-clear" onClick={handleClear} aria-label="Clear search">
                        ✕
                    </button>
                )}
            </div>

            {open && (
                <div className="searchbar-results">
                    {matches.length === 0 ? (
                        <div className="searchbar-empty">No results for "{query}"</div>
                    ) : (
                        matches.map((item, i) => (
                            <div
                                key={getItemId(item) ?? i}
                                className={`searchbar-item ${i === activeIndex ? "active" : ""}`}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelect(item);
                                }}
                            >
                                <span>{highlight(getItemName(item))}</span>
                                {item.category && <span className="searchbar-tag">{item.category}</span>}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchBar;