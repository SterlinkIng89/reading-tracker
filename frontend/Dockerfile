FROM node:lts

WORKDIR /app

# copiar solo package.json (y package-lock.json si existe) para cachear instalación
COPY package*.json ./

# si existe package-lock.json usa npm ci, si no usa npm install
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# copiar el resto (para cuando no montes volumen)
COPY . .

ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

# ejecutar el servidor de desarrollo al iniciar el contenedor
CMD ["npm", "run", "dev"]