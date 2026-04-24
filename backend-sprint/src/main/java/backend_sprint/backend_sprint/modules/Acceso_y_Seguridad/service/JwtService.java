package backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.security.Key;
import java.util.Date;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private static final Key SECRET_KEY = Keys.secretKeyFor(SignatureAlgorithm.HS256);
    private static final long EXPIRATION_TIME = 86400000; // 24 horas

    // In-memory blacklist for simple token invalidation
    private final Set<String> blacklistedTokens = ConcurrentHashMap.newKeySet();

    public String generateToken(String username) {
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(SECRET_KEY)
                .compact();
    }

    public String extractUsername(String token) {
        return Jwts.parserBuilder().setSigningKey(SECRET_KEY).build().parseClaimsJws(token).getBody().getSubject();
    }

    public boolean isTokenValid(String token) {
        if (blacklistedTokens.contains(token)) {
            return false;
        }
        try {
            Jwts.parserBuilder().setSigningKey(SECRET_KEY).build().parseClaimsJws(token);
            return true;
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            throw e;
        } catch (Exception e) {
            return false;
        }
    }

    public void invalidateToken(String token) {
        blacklistedTokens.add(token);
    }

    public String generateCustomToken(String fullName) {
            // Extraemos el primer nombre (Ej: "Elias Perez" -> "elias")
            String firstName = "user";
            if (fullName != null && !fullName.trim().isEmpty()) {
                firstName = fullName.trim().split("\\s+")[0].toLowerCase();
                // Quitamos acentos o caracteres raros por seguridad en URLs
                firstName = firstName.replaceAll("[^a-z0-9]", ""); 
            }
            
            // Generamos un string aleatorio corto (10 caracteres)
            String shortRandom = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
            
            return firstName + "_" + shortRandom;
        }
        
}
