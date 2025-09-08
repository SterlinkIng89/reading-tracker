# Esquema de Colores - Reading Tracker

## 🎨 Paleta de Colores Actual

### Colores Primarios (Slate/Grisáceo)

| Color         | Uso                               | Código Tailwind | Hex       |
| ------------- | --------------------------------- | --------------- | --------- |
| **Slate 600** | Gradientes principales, botones   | `slate-600`     | `#475569` |
| **Slate 700** | Gradientes hover, fondos oscuros  | `slate-700`     | `#334155` |
| **Slate 400** | Texto principal, enlaces, acentos | `slate-400`     | `#94a3b8` |
| **Slate 300** | Estados hover, texto secundario   | `slate-300`     | `#cbd5e1` |
| **Slate 200** | Texto sutil, subtítulos           | `slate-200`     | `#e2e8f0` |
| **Slate 500** | Enfoque de elementos, anillos     | `slate-500`     | `#64748b` |

### Colores de Fondo

| Color        | Uso                               | Código Tailwind | Hex       |
| ------------ | --------------------------------- | --------------- | --------- |
| **Gray 900** | Fondo principal, header           | `gray-900`      | `#111827` |
| **Gray 800** | Gradientes de fondo, contenedores | `gray-800`      | `#1f2937` |
| **Black**    | Fondo de gradiente final          | `black`         | `#000000` |
| **Gray 700** | Fondos de inputs, cards           | `gray-700`      | `#374151` |
| **Gray 600** | Bordes, separadores               | `gray-600`      | `#4b5563` |

### Colores de Estado

| Estado          | Color                   | Código Tailwind             | Uso                               |
| --------------- | ----------------------- | --------------------------- | --------------------------------- |
| **Error**       | Red 400 / Red 900       | `red-400` / `red-900`       | Mensajes de error, validaciones   |
| **Éxito**       | Green 400 / Green 900   | `green-400` / `green-900`   | Mensajes de éxito, confirmaciones |
| **Advertencia** | Yellow 400 / Yellow 900 | `yellow-400` / `yellow-900` | Advertencias, notificaciones      |

## 📋 Reglas de Uso

### 1. Gradientes

```css
/* Gradiente principal para headers y botones */
bg-gradient-to-r from-slate-600 to-slate-700

/* Gradiente hover */
hover:from-slate-700 hover:to-slate-800

/* Gradiente de fondo de página */
bg-gradient-to-br from-gray-900 via-gray-800 to-black
```

### 2. Texto y Enlaces

```css
/* Texto principal */
text-slate-400

/* Estados hover */
hover:text-slate-300

/* Texto sutil */
text-slate-200
```

### 3. Inputs y Formularios

```css
/* Input base */
bg-gray-700 border-gray-600 text-white placeholder-gray-400

/* Estado focus */
focus:ring-2 focus:ring-slate-400 focus:border-slate-400 focus:bg-gray-600
```

### 4. Botones

```css
/* Botón principal */
bg-gradient-to-r from-slate-600 to-slate-700 text-white
hover:from-slate-700 hover:to-slate-800
focus:ring-2 focus:ring-slate-500

/* Transformaciones */
transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
```

### 5. Componentes Específicos

#### AuthHeader

```css
bg-gradient-to-r from-slate-600 to-slate-700
text-white
text-slate-200 /* subtítulo */
```

#### Formularios (SignIn/SignUp)

```css
/* Inputs */
focus:ring-slate-400 focus:border-slate-400

/* Botones */
from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800

/* Enlaces */
text-slate-400 hover:text-slate-300
```

#### Header/Navigation

```css
/* Logo */
text-slate-400 hover:text-slate-300

/* Enlaces de navegación */
text-gray-300 hover:text-slate-400

/* Enlaces de acción */
text-slate-400 hover:text-slate-300
```

#### Footer

```css
/* Texto base */
text-gray-400

/* Enlaces sociales */
hover:text-slate-400
```

## 🔄 Transiciones y Animaciones

### Duraciones Recomendadas

- **Transiciones rápidas**: `duration-200` (200ms)
- **Transiciones normales**: `duration-300` (300ms)
- **Transiciones suaves**: `duration-500` (500ms)

### Efectos de Hover

```css
/* Escala sutil */
hover:scale-[1.02] active:scale-[0.98]

/* Transición de colores */
transition-colors duration-200

/* Transición completa */
transition-all duration-200
```

## 🎯 Principios de Diseño

### 1. Consistencia

- Usar siempre la paleta slate para elementos interactivos
- Mantener jerarquía visual con grises para fondos y slate para acentos

### 2. Accesibilidad

- Contraste mínimo de 4.5:1 entre texto y fondo
- Estados hover claramente diferenciados
- Enfoque visible en todos los elementos interactivos

### 3. Minimalismo

- Colores neutros que no compitan con el contenido
- Uso estratégico de acentos slate
- Fondos oscuros para reducir fatiga visual

### 4. Escalabilidad

- Sistema de colores extensible
- Fácil modificación de intensidad (200-700)
- Compatible con temas futuros

## 📁 Estructura de Archivos

```
frontend/src/
├── components/signin/
│   ├── AuthHeader.astro      # Header con gradiente slate
│   ├── SignInForm.astro      # Formulario con colores slate
│   ├── SignUpForm.astro      # Formulario con colores slate
│   └── AuthContainer.astro   # Contenedor principal
├── layout/
│   ├── BaseLayout.astro      # Layout base
│   └── components/
│       ├── Header.astro      # Navegación slate
│       └── Footer.astro      # Footer con enlaces slate
└── pages/
    └── signin.astro          # Página principal slate
```

## 🚀 Próximas Mejoras

### Tema Oscuro Mejorado

- Implementar variables CSS para fácil cambio de tema
- Agregar modo claro opcional
- Sistema de colores dinámico

### Accesibilidad

- Verificar contraste WCAG AAA
- Agregar indicadores de foco más prominentes
- Soporte para usuarios con daltonismo

### Componentes

- Crear sistema de design tokens
- Documentar componentes con Storybook
- Crear paleta de colores expandida

---

_Última actualización: Septiembre 2025_
_Esquema de colores: Slate (Grisáceo)_</content>
<parameter name="filePath">c:\Users\99hon\Documents\GitHub\reading-tracker\COLORS.md
