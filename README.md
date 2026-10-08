# Proyecto Integrador: Pipeline CI/CD Automatizado para API REST

UTEQ
Ingeniería en Desarrollo de Software
Asignatura: Gestión de Proyectos de Software
Autor: Juan Martín Centeno Ramírez

---

## 1. Documentación de la Arquitectura del Proyecto

Este proyecto implementa una arquitectura moderna de Integración Continua y Despliegue Continuo (CI/CD) diseñada para automatizar todo el ciclo de vida de una API REST. La arquitectura se divide en cuatro fases principales interconectadas:

### Fase A: Desarrollo y Calidad de Código (Backend)
La base de la aplicación es una API REST desarrollada con Node.js y el framework Express. Para asegurar la calidad y estabilidad del código, la arquitectura integra los frameworks Jest y Supertest. Estos se encargan de ejecutar una batería de 20 pruebas unitarias que validan cada endpoint, manejos de errores y respuestas HTTP. El objetivo estructural de esta fase es impedir que código defectuoso avance, exigiendo un porcentaje de cobertura de código (Code Coverage) superior al 70%.

### Fase B: Integración Continua (CI) con GitHub Actions
El motor de automatización de esta arquitectura es GitHub Actions. A través del archivo de configuración estructurado en `.github/workflows/main.yml`, el repositorio se mantiene a la escucha de eventos de tipo "push" o "pull_request" hacia la rama principal. Al detectar un cambio, GitHub Actions levanta un entorno virtual aislado (Ubuntu) donde clona el código, instala las dependencias de Node.js y ejecuta de forma autónoma las pruebas unitarias. Si alguna prueba falla, el pipeline se detiene inmediatamente.

### Fase C: Contenedorización y Registro de Artefactos (Docker)
Una vez que el código supera las pruebas unitarias, la arquitectura procede a empaquetar la aplicación. Se utiliza un archivo Dockerfile optimizado basado en una imagen ligera (Node 18 Alpine) y un archivo .dockerignore para excluir directorios pesados o innecesarios. El pipeline compila esta imagen y, tras autenticarse de manera segura, la publica en el registro público de Docker Hub. Para garantizar un control de versiones estricto, la imagen se etiqueta tanto con "latest" como con el hash criptográfico del commit exacto que generó el cambio.

### Fase D: Despliegue Continuo (CD) en AWS EC2
La fase final de la arquitectura automatiza la puesta en producción. Desde GitHub Actions, se establece una conexión segura mediante el protocolo SSH hacia un servidor virtual en Amazon Web Services (Instancia EC2 con Ubuntu Server). Una vez dentro del servidor, el flujo automatizado detiene y elimina el contenedor de la versión anterior de la API, extrae la imagen más reciente recién subida a Docker Hub y ejecuta un nuevo contenedor exponiendo el servicio en el puerto 80, permitiendo que la API reciba tráfico web sin requerir intervención humana.

---

## 2. Comandos Locales (Paso a Paso)

Para que cualquier desarrollador pueda replicar, modificar o probar este proyecto en su entorno de trabajo local, se deben seguir los siguientes pasos en orden secuencial. Se asume que el usuario tiene instalado Node.js, Git y Docker en su sistema operativo.

Paso 1: Clonar el repositorio
Descarga el código fuente a tu máquina local mediante Git y accede al directorio del proyecto:
git clone <URL_DEL_REPOSITORIO>
cd pipeline-cicd-api

Paso 2: Instalación limpia de dependencias
Para instalar los módulos de Node.js respetando estrictamente las versiones definidas en el archivo package-lock.json, ejecuta el siguiente comando:
npm ci

Paso 3: Ejecución de pruebas y reporte de cobertura
Antes de levantar el servidor o realizar cualquier cambio, es obligatorio validar que el código es estable. Ejecuta la herramienta Jest con el parámetro de cobertura:
npx jest --coverage
(Este comando imprimirá en la terminal los resultados de las 20 pruebas unitarias y una tabla detallando el porcentaje de cobertura de código).

Paso 4: Ejecución del servidor local
Una vez que las pruebas han sido superadas, puedes levantar la API en tu entorno local para pruebas manuales:
node api.js
(La consola indicará que el servidor está escuchando en el puerto configurado, típicamente el puerto 80 o 6061).

---

## 3. Pasos de Configuración de Infraestructura y Pipeline

Para que la automatización descrita en la arquitectura funcione correctamente en la nube, es imperativo configurar las credenciales y el entorno del servidor siguiendo este procedimiento.

### A. Configuración de la Instancia en AWS EC2
Paso 1: Ingresa a la consola de AWS, dirígete al servicio EC2 y selecciona "Lanzar instancia".
Paso 2: Selecciona "Ubuntu Server" como sistema operativo base (AMI).
Paso 3: En la sección "Par de claves", selecciona "Crear nuevo par de claves", elige el formato .pem y descarga el archivo a tu computadora. Este archivo es crítico para la conexión SSH.
Paso 4: En la sección de configuración de red (Grupos de seguridad), añade reglas de entrada (Inbound rules) para permitir tráfico en los siguientes puertos:
- Puerto 22 (TCP) para permitir la conexión SSH de GitHub Actions.
- Puerto 80 (HTTP) para permitir peticiones web hacia la API.
- Puerto 6061 (TCP) para el funcionamiento del socket de la aplicación.
Paso 5: Lanza la instancia y copia la Dirección IPv4 pública asignada.

### B. Configuración de Secretos en GitHub Actions
Por normas de seguridad, está estrictamente prohibido colocar contraseñas, IPs o llaves privadas en el código público. Estas deben registrarse en el repositorio como secretos.
Paso 1: Ve a la página de tu repositorio en GitHub.
Paso 2: Navega a la pestaña "Settings" (Configuración).
Paso 3: En el menú lateral izquierdo, despliega "Secrets and variables" y selecciona "Actions".
Paso 4: Haz clic en el botón "New repository secret" para agregar, una por una, las siguientes variables exactas:
- DOCKERHUB_USERNAME: Tu nombre de usuario registrado en Docker Hub.
- DOCKERHUB_TOKEN: El Personal Access Token (PAT) generado desde Docker Hub con permisos de lectura y escritura.
- EC2_HOST: La Dirección IPv4 pública que copiaste de tu instancia de AWS.
- EC2_USERNAME: El usuario por defecto de la instancia (deberás escribir la palabra ubuntu).
- EC2_SSH_KEY: El contenido íntegro de tu archivo .pem descargado en AWS (debes abrir el archivo con un editor de texto y copiar todo, incluyendo las líneas de BEGIN y END).

### C. Activación del Pipeline
Paso 1: Una vez que el código y los secretos están configurados, realiza cualquier cambio en los archivos del proyecto.
Paso 2: Ejecuta los comandos de control de versiones para subir el cambio:
git add .
git commit -m "Activación inicial del pipeline CI/CD"
git push origin main
Paso 3: Dirígete a la pestaña "Actions" en GitHub para visualizar en tiempo real cómo el pipeline compila el proyecto, ejecuta las pruebas y despliega la API en el servidor AWS.