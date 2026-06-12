package backend_sprint.backend_sprint.modules.GestionDocumental.service;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

@Service
public class S3StorageService {

    private final S3Client s3Client;

    @Value("${aws.s3.bucket}")
    private String bucketName;

    public S3StorageService(S3Client s3Client) {
        this.s3Client = s3Client;
    }

    public String uploadFile(
            MultipartFile file,
            String storedFileName
    ) throws IOException {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("El archivo no puede estar vacío");
        }

        if (storedFileName == null || storedFileName.trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre interno del archivo es obligatorio");
        }

        String key = buildDocumentKey(storedFileName);
        String contentType = resolveContentType(file);

        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(contentType)
                    .contentLength(file.getSize())
                    .build();

            s3Client.putObject(
                    putObjectRequest,
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize())
            );

            return key;

        } catch (S3Exception e) {
            System.err.println("ERROR S3 STATUS: " + e.statusCode());
            System.err.println("ERROR S3 CODE: " + e.awsErrorDetails().errorCode());
            System.err.println("ERROR S3 MESSAGE: " + e.awsErrorDetails().errorMessage());

            throw new RuntimeException(
                    "No se pudo subir el archivo a S3: "
                            + e.awsErrorDetails().errorCode()
                            + " - "
                            + e.awsErrorDetails().errorMessage(),
                    e
            );

        } catch (SdkClientException e) {
            System.err.println("ERROR SDK CLIENT: " + e.getMessage());

            throw new RuntimeException(
                    "No se pudo conectar con AWS S3. Revisa credenciales, región o conexión: "
                            + e.getMessage(),
                    e
            );
        }
    }

    public Resource loadFileAsResource(
            String storagePath,
            String originalFileName
    ) {
        if (storagePath == null || storagePath.trim().isEmpty()) {
            throw new IllegalArgumentException("La ruta del archivo en S3 es obligatoria");
        }

        String safeOriginalFileName = resolveOriginalFileName(originalFileName);

        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(storagePath)
                    .build();

            ResponseBytes<GetObjectResponse> objectBytes =
                    s3Client.getObjectAsBytes(getObjectRequest);

            byte[] bytes = objectBytes.asByteArray();

            return new ByteArrayResource(bytes) {
                @Override
                public String getFilename() {
                    return safeOriginalFileName;
                }
            };

        } catch (S3Exception e) {
            System.err.println("ERROR S3 DOWNLOAD STATUS: " + e.statusCode());
            System.err.println("ERROR S3 DOWNLOAD CODE: " + e.awsErrorDetails().errorCode());
            System.err.println("ERROR S3 DOWNLOAD MESSAGE: " + e.awsErrorDetails().errorMessage());

            throw new RuntimeException(
                    "No se pudo descargar el archivo desde S3: "
                            + e.awsErrorDetails().errorCode()
                            + " - "
                            + e.awsErrorDetails().errorMessage(),
                    e
            );

        } catch (SdkClientException e) {
            System.err.println("ERROR SDK CLIENT DOWNLOAD: " + e.getMessage());

            throw new RuntimeException(
                    "No se pudo conectar con AWS S3 para descargar. Revisa credenciales, región o conexión: "
                            + e.getMessage(),
                    e
            );
        }
    }

    private String buildDocumentKey(String storedFileName) {
        return "workflow-documents/" + storedFileName;
    }

    private String resolveContentType(MultipartFile file) {
        String contentType = file.getContentType();

        if (contentType == null || contentType.trim().isEmpty()) {
            return "application/octet-stream";
        }

        return contentType;
    }

    private String resolveOriginalFileName(String originalFileName) {
        if (originalFileName == null || originalFileName.trim().isEmpty()) {
            return "documento";
        }

        return originalFileName;
    }
}