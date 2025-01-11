// vite.config.mjs
import Components from "file:///D:/GitHub/PWS-teacher-web-app/vuejs/node_modules/unplugin-vue-components/dist/vite.js";
import Vue from "file:///D:/GitHub/PWS-teacher-web-app/vuejs/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import Vuetify, {
  transformAssetUrls
} from "file:///D:/GitHub/PWS-teacher-web-app/vuejs/node_modules/vite-plugin-vuetify/dist/index.mjs";
import ViteFonts from "file:///D:/GitHub/PWS-teacher-web-app/vuejs/node_modules/unplugin-fonts/dist/vite.mjs";
import {
  defineConfig
} from "file:///D:/GitHub/PWS-teacher-web-app/vuejs/node_modules/vite/dist/node/index.js";
import {
  fileURLToPath,
  URL
} from "node:url";
var __vite_injected_original_import_meta_url = "file:///D:/GitHub/PWS-teacher-web-app/vuejs/vite.config.mjs";
var vite_config_default = defineConfig({
  plugins: [
    Vue({
      template: {
        transformAssetUrls
      }
    }),
    // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
    Vuetify(),
    Components(),
    ViteFonts({
      google: {
        families: [{
          name: "Roboto",
          styles: "wght@100;300;400;500;700;900"
        }]
      }
    })
  ],
  define: {
    "process.env": {}
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(
        "./src",
        __vite_injected_original_import_meta_url
      ))
    },
    extensions: [
      ".js",
      ".json",
      ".jsx",
      ".mjs",
      ".ts",
      ".tsx",
      ".vue"
    ]
  },
  server: {
    port: 3e3
  },
  optimizeDeps: {
    exclude: ["pdfjs-dist"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcubWpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRDpcXFxcR2l0SHViXFxcXFBXUy10ZWFjaGVyLXdlYi1hcHBcXFxcdnVlanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXEdpdEh1YlxcXFxQV1MtdGVhY2hlci13ZWItYXBwXFxcXHZ1ZWpzXFxcXHZpdGUuY29uZmlnLm1qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovR2l0SHViL1BXUy10ZWFjaGVyLXdlYi1hcHAvdnVlanMvdml0ZS5jb25maWcubWpzXCI7Ly8gUGx1Z2luc1xyXG5pbXBvcnQgQ29tcG9uZW50cyBmcm9tICd1bnBsdWdpbi12dWUtY29tcG9uZW50cy92aXRlJ1xyXG5pbXBvcnQgVnVlIGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZSdcclxuaW1wb3J0IFZ1ZXRpZnksIHtcclxuICAgIHRyYW5zZm9ybUFzc2V0VXJsc1xyXG59IGZyb20gJ3ZpdGUtcGx1Z2luLXZ1ZXRpZnknXHJcbmltcG9ydCBWaXRlRm9udHMgZnJvbSAndW5wbHVnaW4tZm9udHMvdml0ZSdcclxuXHJcbi8vIFV0aWxpdGllc1xyXG5pbXBvcnQge1xyXG4gICAgZGVmaW5lQ29uZmlnXHJcbn0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHtcclxuICAgIGZpbGVVUkxUb1BhdGgsXHJcbiAgICBVUkxcclxufSBmcm9tICdub2RlOnVybCdcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgICBwbHVnaW5zOiBbXHJcbiAgICAgICAgVnVlKHtcclxuICAgICAgICAgICAgdGVtcGxhdGU6IHtcclxuICAgICAgICAgICAgICAgIHRyYW5zZm9ybUFzc2V0VXJsc1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3Z1ZXRpZnlqcy92dWV0aWZ5LWxvYWRlci90cmVlL21hc3Rlci9wYWNrYWdlcy92aXRlLXBsdWdpbiNyZWFkbWVcclxuICAgICAgICBWdWV0aWZ5KCksXHJcbiAgICAgICAgQ29tcG9uZW50cygpLFxyXG4gICAgICAgIFZpdGVGb250cyh7XHJcbiAgICAgICAgICAgIGdvb2dsZToge1xyXG4gICAgICAgICAgICAgICAgZmFtaWxpZXM6IFt7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ1JvYm90bycsXHJcbiAgICAgICAgICAgICAgICAgICAgc3R5bGVzOiAnd2dodEAxMDA7MzAwOzQwMDs1MDA7NzAwOzkwMCcsXHJcbiAgICAgICAgICAgICAgICB9XSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9KSxcclxuICAgIF0sXHJcbiAgICBkZWZpbmU6IHtcclxuICAgICAgICAncHJvY2Vzcy5lbnYnOiB7fVxyXG4gICAgfSxcclxuICAgIHJlc29sdmU6IHtcclxuICAgICAgICBhbGlhczoge1xyXG4gICAgICAgICAgICAnQCc6IGZpbGVVUkxUb1BhdGgobmV3IFVSTCgnLi9zcmMnLFxyXG4gICAgICAgICAgICAgICAgaW1wb3J0Lm1ldGEudXJsKSlcclxuICAgICAgICB9LFxyXG4gICAgICAgIGV4dGVuc2lvbnM6IFtcclxuICAgICAgICAgICAgJy5qcycsXHJcbiAgICAgICAgICAgICcuanNvbicsXHJcbiAgICAgICAgICAgICcuanN4JyxcclxuICAgICAgICAgICAgJy5tanMnLFxyXG4gICAgICAgICAgICAnLnRzJyxcclxuICAgICAgICAgICAgJy50c3gnLFxyXG4gICAgICAgICAgICAnLnZ1ZScsXHJcbiAgICAgICAgXSxcclxuICAgIH0sXHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgICBwb3J0OiAzMDAwLFxyXG4gICAgfSxcclxuICAgIG9wdGltaXplRGVwczoge1xyXG4gICAgICAgIGV4Y2x1ZGU6IFsncGRmanMtZGlzdCddXHJcbiAgICB9XHJcbn0pIl0sCiAgIm1hcHBpbmdzIjogIjtBQUNBLE9BQU8sZ0JBQWdCO0FBQ3ZCLE9BQU8sU0FBUztBQUNoQixPQUFPO0FBQUEsRUFDSDtBQUFBLE9BQ0c7QUFDUCxPQUFPLGVBQWU7QUFHdEI7QUFBQSxFQUNJO0FBQUEsT0FDRztBQUNQO0FBQUEsRUFDSTtBQUFBLEVBQ0E7QUFBQSxPQUNHO0FBZitLLElBQU0sMkNBQTJDO0FBa0J2TyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUN4QixTQUFTO0FBQUEsSUFDTCxJQUFJO0FBQUEsTUFDQSxVQUFVO0FBQUEsUUFDTjtBQUFBLE1BQ0o7QUFBQSxJQUNKLENBQUM7QUFBQTtBQUFBLElBRUQsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsVUFBVTtBQUFBLE1BQ04sUUFBUTtBQUFBLFFBQ0osVUFBVSxDQUFDO0FBQUEsVUFDUCxNQUFNO0FBQUEsVUFDTixRQUFRO0FBQUEsUUFDWixDQUFDO0FBQUEsTUFDTDtBQUFBLElBQ0osQ0FBQztBQUFBLEVBQ0w7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNKLGVBQWUsQ0FBQztBQUFBLEVBQ3BCO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDTCxPQUFPO0FBQUEsTUFDSCxLQUFLLGNBQWMsSUFBSTtBQUFBLFFBQUk7QUFBQSxRQUN2QjtBQUFBLE1BQWUsQ0FBQztBQUFBLElBQ3hCO0FBQUEsSUFDQSxZQUFZO0FBQUEsTUFDUjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0o7QUFBQSxFQUNKO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDSixNQUFNO0FBQUEsRUFDVjtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1YsU0FBUyxDQUFDLFlBQVk7QUFBQSxFQUMxQjtBQUNKLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
