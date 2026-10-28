package com.schoolms.security;

import com.schoolms.model.User;

public final class AuthContext {
    private static final ThreadLocal<User> CURRENT = new ThreadLocal<>();

    private AuthContext() {
    }

    public static void set(User user) {
        CURRENT.set(user);
    }

    public static User get() {
        return CURRENT.get();
    }

    public static User require() {
        User user = CURRENT.get();
        if (user == null) {
            throw com.schoolms.web.ApiException.unauthorized("You must sign in to continue.");
        }
        return user;
    }

    public static void clear() {
        CURRENT.remove();
    }
}
