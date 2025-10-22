package com.security.ailogsystem.service;

import com.security.ailogsystem.model.User;

import java.util.List;
import java.util.Optional;

public interface UserService {
    
    User createUser(User user);
    
    Optional<User> findByUsername(String username);
    
    Optional<User> findByEmail(String email);
    
    List<User> findAllUsers();
    
    User updateUser(User user);
    
    void deleteUser(Long id);
    
    boolean validatePassword(String rawPassword, String encodedPassword);
    
    User updateLastLogin(String username);

    /**
     * Change password for a user after validating the old password.
     */
    boolean changePassword(String username, String oldPassword, String newPassword);
}
