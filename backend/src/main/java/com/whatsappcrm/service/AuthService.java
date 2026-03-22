package com.whatsappcrm.service;

import com.whatsappcrm.dto.*;
import com.whatsappcrm.entity.Account;
import com.whatsappcrm.entity.AccountUser;
import com.whatsappcrm.entity.User;
import com.whatsappcrm.enums.UserRole;
import com.whatsappcrm.exception.BadRequestException;
import com.whatsappcrm.repository.AccountRepository;
import com.whatsappcrm.repository.AccountUserRepository;
import com.whatsappcrm.repository.UserRepository;
import com.whatsappcrm.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final AccountUserRepository accountUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        // Create account
        Account account = Account.builder()
                .name(request.getAccountName())
                .build();
        account = accountRepository.save(account);

        // Create user
        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();
        user = userRepository.save(user);

        // Link user to account as admin
        AccountUser accountUser = AccountUser.builder()
                .account(account)
                .user(user)
                .role(UserRole.ADMIN)
                .build();
        accountUserRepository.save(accountUser);

        // Reload user with account associations
        user = userRepository.findById(user.getId()).orElseThrow();

        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId(), user.getEmail());

        return AuthResponse.of(accessToken, refreshToken, UserResponse.fromUser(user));
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("User not found"));

        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId(), user.getEmail());

        return AuthResponse.of(accessToken, refreshToken, UserResponse.fromUser(user));
    }

    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String token = request.getRefreshToken();

        if (!jwtTokenProvider.validateToken(token) || !"refresh".equals(jwtTokenProvider.getTokenType(token))) {
            throw new BadRequestException("Invalid refresh token");
        }

        Long userId = jwtTokenProvider.getUserIdFromToken(token);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));

        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(user.getId(), user.getEmail());

        return AuthResponse.of(accessToken, newRefreshToken, UserResponse.fromUser(user));
    }
}
