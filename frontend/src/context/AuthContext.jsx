import React, { createContext, useState } from "react";

export const AuthContext = createContext();

const getInitialUser = () => {
  try {
    const storedUser = localStorage.getItem("userInfo");
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(getInitialUser);

    const login = (userData) => {
       setUser(userData);
       localStorage.setItem("userInfo", JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("userInfo");
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
             {children}
        </AuthContext.Provider>
    )
};
