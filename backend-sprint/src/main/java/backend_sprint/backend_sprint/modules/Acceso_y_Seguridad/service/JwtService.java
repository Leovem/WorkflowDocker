package backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.service;

import java.security.Key;
import java.util.Date;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    // Clave secreta persistente (se configura en application.properties). 
    // Debe tener al menos 256 bits codificada en Base64.
    private final Key secretKey;
    private static final long EXPIRATION_TIME = 86400000; // 24 horas

    // Lista negra temporal en memoria (Idealmente en el futuro cámbiala a Redis con TTL)
    private final Set<String> blacklistedTokens = ConcurrentHashMap.newKeySet();

    // El constructor recibe la clave desde las configuraciones de Spring
    public JwtService(@Value("${jwt.secret:ZXN0YS1lcy11bmEtY2xhdmUtc2VjcmV0YS15LXNlZ3VyYS1wYXJhLXRva2Vucy1qd3QtMjAyNg==}") String base64Secret) {
        byte[] keyBytes = Decoders.BASE64.decode(base64Secret);
        this.secretKey = Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(String username) {
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(secretKey)
                .compact();
    }

    public String extractUsername(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(secretKey)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    public boolean isTokenValid(String token) {
        if (blacklistedTokens.contains(token)) {
            log.warn("⚠️ Intento de acceso con un token que está en la lista negra.");
            return false;
        }
        try {
            Jwts.parserBuilder().setSigningKey(secretKey).build().parseClaimsJws(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.warn("⏳ El token JWT ha expirado.");
            throw e; // Mantenemos el relanzamiento por si tu filtro de seguridad maneja las expiraciones de forma especial
        } catch (JwtException | IllegalArgumentException e) {
            // CORREGIDO: Capturamos fallos específicos de firmas o tokens mal formados de la librería sin usar 'Exception' genérica
            log.error("❌ Token inválido detectado debido a: {}", e.getMessage());
            return false;
        }
    }

    public void invalidateToken(String token) {
        blacklistedTokens.add(token);
        log.info("🚪 Token añadido a la lista negra de manera exitosa.");
    }

    public String generateCustomToken(String fullName) {
        String firstName = "user";
        if (fullName != null && !fullName.trim().isEmpty()) {
            firstName = fullName.trim().split("\\s+")[0].toLowerCase();
            firstName = firstName.replaceAll("[^a-z0-9]", ""); 
        }
        
        String shortRandom = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        return firstName + "_" + shortRandom;
    }
}