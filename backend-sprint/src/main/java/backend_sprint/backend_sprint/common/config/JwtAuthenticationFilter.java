package backend_sprint.backend_sprint.common.config;

import java.io.IOException;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.model.User;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.repository.UserRepository;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        String jwt = null;
        
        // 1. Intentamos sacar el token de la cabecera
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            jwt = authHeader.substring(7);
        }

        // 2. Si no hubo suerte con la cabecera, buscamos obligatoriamente en la URL
        if (jwt == null && request.getParameter("token") != null) {
            jwt = request.getParameter("token");
        }

        // --- 🕵️‍♂️ RAYOS X PARA LA CONSOLA ---
        if (request.getRequestURI().contains("/stream/")) {
            System.out.println("🚨 [DEBUG SSE] Petición entrante a: " + request.getRequestURI());
            System.out.println("🚨 [DEBUG SSE] Token extraído: " + (jwt != null ? "SÍ (Termina en " + jwt.substring(jwt.length() - 5) + ")" : "NULO"));
            System.out.println("🚨 [DEBUG SSE] ¿Token válido?: " + jwtService.isTokenValid(jwt));
        }
        // ------------------------------------

        if (jwt == null) {
            filterChain.doFilter(request, response);
            return;
        }


        final String username;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            if (jwtService.isTokenValid(jwt)) {
                username = jwtService.extractUsername(jwt);
                if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                    User user = userRepository.findByName(username).orElse(null);

                    if (user != null && user.isActive()) {
                        String roleName = user.getRole() != null && user.getRole().getName() != null
                                ? user.getRole().getName()
                                : "USER";

                        System.out.println("========== DEBUG JWT ==========");
                        System.out.println("1. Usuario extraído: " + user.getName());
                        System.out.println("2. Objeto Role entero: " + user.getRole());
                        System.out.println("3. Nombre del Rol que se inyectará: " + roleName);
                        System.out.println("===============================");

                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                user.getName(),
                                null,
                                List.of(new SimpleGrantedAuthority(roleName)));
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                    }
                }
            }
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.getWriter()
                    .write("{\"message\": \"El acceso ha caducado por motivos de seguridad.\"}");
            return;
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.getWriter()
                    .write("{\"error\": \"No Autorizado\", \"message\": \"Firma del token inválida o token en lista negra\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
