package com.whatsappcrm.service;

import com.whatsappcrm.dto.ChangePasswordRequest;
import com.whatsappcrm.dto.UpdateAvailabilityRequest;
import com.whatsappcrm.dto.UpdateProfileRequest;
import com.whatsappcrm.dto.UserResponse;
import com.whatsappcrm.entity.User;
import com.whatsappcrm.exception.BadRequestException;
import com.whatsappcrm.exception.ResourceNotFoundException;
import com.whatsappcrm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return UserResponse.fromUser(user);
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Transactional
    public UserResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = getUserByEmail(email);

        if (StringUtils.hasText(request.getName())) {
            user.setName(request.getName());
        }
        if (request.getDisplayName() != null) {
            user.setDisplayName(request.getDisplayName());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }

        user = userRepository.save(user);
        return UserResponse.fromUser(user);
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        User user = getUserByEmail(email);

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Transactional
    public UserResponse updateAvailability(String email, UpdateAvailabilityRequest request) {
        User user = getUserByEmail(email);

        User.AvailabilityStatus status;
        try {
            status = User.AvailabilityStatus.valueOf(request.getAvailability().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid availability. Must be ONLINE, OFFLINE, or BUSY");
        }

        user.setAvailability(status);
        user = userRepository.save(user);
        return UserResponse.fromUser(user);
    }
}
