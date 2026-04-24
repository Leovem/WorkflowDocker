package backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.service;

import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.DTO.DepartamentDTO;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.model.Departament;
import backend_sprint.backend_sprint.modules.Acceso_y_Seguridad.repository.DepartamentRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DepartamentServiceImpl implements DepartamentService {

    private final DepartamentRepository departamentRepository;

    @Override
    public List<DepartamentDTO> findAll() {
        return departamentRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public DepartamentDTO findById(String id) {
        Departament departament = departamentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Departamento no encontrado con ID: " + id));
        return mapToDTO(departament);
    }

    @Override
    public DepartamentDTO create(DepartamentDTO request) {
        if (departamentRepository.existsByName(request.getName())) {
            throw new IllegalStateException("Ya existe un departamento con el nombre: " + request.getName());
        }
        Departament departament = new Departament();
        departament.setName(request.getName());
        Departament savedDepartament = departamentRepository.save(departament);
        return mapToDTO(savedDepartament);
    }

    @Override
    public DepartamentDTO update(String id, DepartamentDTO request) {
        Departament departament = departamentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Departamento no encontrado con ID: " + id));

        if (!departament.getName().equals(request.getName()) && departamentRepository.existsByName(request.getName())) {
            throw new IllegalStateException("Ya existe un departamento con el nombre: " + request.getName());
        }

        departament.setName(request.getName());
        Departament updatedDepartament = departamentRepository.save(departament);
        return mapToDTO(updatedDepartament);
    }

    @Override
    public void delete(String id) {
        if (!departamentRepository.existsById(id)) {
            throw new IllegalArgumentException("Departamento no encontrado con ID: " + id);
        }
        departamentRepository.deleteById(id);
    }

    private DepartamentDTO mapToDTO(Departament departament) {
        return DepartamentDTO.builder()
                .id(departament.getId())
                .name(departament.getName())
                .build();
    }
}
