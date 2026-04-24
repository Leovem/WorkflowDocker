import asyncio
import logging
from sqlalchemy import text
from app.db.session import AsyncSessionLocal, Base, engine
from app.models.models import Usuario, Rol, Departamento, Solicitante, Tramite, Politica
from passlib.context import CryptContext

logging.getLogger('passlib').setLevel(logging.ERROR)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_data():
    print("🚀 Iniciando carga de datos reales UAGRM...")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("🧹 Limpiando base de datos...")
        await conn.execute(text("TRUNCATE TABLE usuarios, roles, departamentos, solicitantes, tramites, politicas RESTART IDENTITY CASCADE;"))

    async with AsyncSessionLocal() as session:
        try:
            # 1. ROLES
            rol_root = Rol(nombre="Root")
            rol_admin = Rol(nombre="Administrador")
            rol_func = Rol(nombre="Funcionario")
            session.add_all([rol_root, rol_admin, rol_func])
            await session.flush()

            # 2. DEPARTAMENTOS (5 Reales)
            d1 = Departamento(nombre="Facultad de Ciencias de la Computación")
            d2 = Departamento(nombre="Dirección Administrativa Financiera (DAF)")
            d3 = Departamento(nombre="Recursos Humanos")
            d4 = Departamento(nombre="Biblioteca Central")
            d5 = Departamento(nombre="Departamento de Activos Fijos")
            session.add_all([d1, d2, d3, d4, d5])
            await session.flush()

            # 3. USUARIOS (1 Root, 1 Admin, 10 Funcionarios)
            pass_hash = pwd_context.hash("uagrm123")
            
            # Admins
            u_root = Usuario(nombre="Puma Root", email="root@uagrm.edu.bo", password_hash=pass_hash, id_rol=rol_root.id_rol, id_depto=None)
            u_admin = Usuario(nombre="Admin General", email="admin@uagrm.edu.bo", password_hash=pass_hash, id_rol=rol_admin.id_rol, id_depto=d5.id_depto)
            session.add_all([u_root, u_admin])

            # 10 Funcionarios distribuidos
            funcionarios = [
                # Computación
                Usuario(nombre="Ing. Evans Balcazar", email="ebalcazar@uagrm.edu.bo", password_hash=pass_hash, id_rol=rol_func.id_rol, id_depto=d1.id_depto),
                Usuario(nombre="Ing. Alberto Mollo", email="amollo@uagrm.edu.bo", password_hash=pass_hash, id_rol=rol_func.id_rol, id_depto=d1.id_depto),
                # DAF
                Usuario(nombre="Lic. Maria Rojas", email="mrojas@uagrm.edu.bo", password_hash=pass_hash, id_rol=rol_func.id_rol, id_depto=d2.id_depto),
                Usuario(nombre="Lic. Carlos Daza", email="cdaza@uagrm.edu.bo", password_hash=pass_hash, id_rol=rol_func.id_rol, id_depto=d2.id_depto),
                # RRHH
                Usuario(nombre="Dra. Claudia Vaca", email="cvaca@uagrm.edu.bo", password_hash=pass_hash, id_rol=rol_func.id_rol, id_depto=d3.id_depto),
                Usuario(nombre="Lic. Sergio Peredo", email="speredo@uagrm.edu.bo", password_hash=pass_hash, id_rol=rol_func.id_rol, id_depto=d3.id_depto),
                # Biblioteca
                Usuario(nombre="Msc. Ana Gutierrez", email="agutierrez@uagrm.edu.bo", password_hash=pass_hash, id_rol=rol_func.id_rol, id_depto=d4.id_depto),
                Usuario(nombre="Lic. Pedro Ortiz", email="portiz@uagrm.edu.bo", password_hash=pass_hash, id_rol=rol_func.id_rol, id_depto=d4.id_depto),
                # Activos Fijos
                Usuario(nombre="Ing. Ricardo Paz", email="rpaz@uagrm.edu.bo", password_hash=pass_hash, id_rol=rol_func.id_rol, id_depto=d5.id_depto),
                Usuario(nombre="Lic. Jimena Flores", email="jflores@uagrm.edu.bo", password_hash=pass_hash, id_rol=rol_func.id_rol, id_depto=d5.id_depto),
            ]
            
            session.add_all(funcionarios)
            await session.commit()
            print("✅ 5 Departamentos y 12 Usuarios cargados con éxito.")
            print("🔑 Password para todos: uagrm123")

        except Exception as e:
            print(f"❌ Error: {e}")
            await session.rollback()

if __name__ == "__main__":
    asyncio.run(seed_data())