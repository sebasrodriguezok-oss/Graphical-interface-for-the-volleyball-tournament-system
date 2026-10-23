# 🏐 Tournament Voley App - Frontend

Aplicación cliente desarrollada en Angular para la gestión de torneos de vóley. Este proyecto ha sido implementado siguiendo los patrones de diseño del proyecto `characters-app-ejemplo`.

## 🏗️ Estructura del Proyecto
El frontend está organizado en capas para separar la lógica de la presentación:

### 1. Capa de Datos (`src/app/shared`)
- **`voley.ts`**: Define las interfaces de TypeScript que actúan como contrato con la API (Tournament, Team, Match, etc.).
- **`voley.service.ts`**: Servicio centralizado que utiliza `HttpClient` para comunicarse con el backend. Centraliza todas las llamadas API.

### 2. Capa de Componentes (`src/app/...`)
- **`tournament-list`**: Componente de visualización tabular de torneos con opciones de edición y eliminación.
- **`tournament-form`**: (En desarrollo) Formulario para creación y edición de torneos.
- **`team-list` / `team-form`**: (Pendientes) Gestión de equipos.

## 🛠️ Tecnologías Utilizadas
- **Framework**: Angular v21
- **UI Library**: Angular Material (Componentes de tabla, tarjetas, botones y spinners).
- **Estado**: Angular Signals (para una gestión de estado reactiva y eficiente).
- **Estilos**: CSS moderno utilizando variables de sistema de Material Design.

## 📖 Guía de Implementación
Para cada nueva funcionalidad, se sigue este flujo:
1. **Definición del Modelo** $\rightarrow$ Actualizar `voley.ts`.
2. **Implementación del Método** $\rightarrow$ Agregar función al `VoleyService`.
3. **Creación de Componente** $\rightarrow$ Implementar la vista (TS, HTML, CSS).
4. **Configuración de Rutas** $\rightarrow$ Añadir la ruta en `app.routes.ts`.

## 🔗 Conexión con API
Por defecto, la aplicación se conecta a: `http://localhost:3000/api`
