// src/pages/Login.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Container,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Typography,
  Link,
  Snackbar,
  Alert,
  Paper,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import ReCAPTCHA from "react-google-recaptcha";
import axios from "axios";
import { API_URL } from "../../../config/apiConfig";

const Login = () => {
  const captchaRef = useRef(null);

  // 1) Configuramos axios para enviar cookies
  useEffect(() => {
    axios.defaults.withCredentials = true;
  }, []);

  // Estilos para inputs (TextField) en foco
  const inputStyles = {
    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#81c784",
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: "#81c784",
    },
  };

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaValue, setCaptchaValue] = useState(null);
  const [errorEmail, setErrorEmail] = useState(false);
  const [errorPassword, setErrorPassword] = useState(false);
  const [errorCaptcha, setErrorCaptcha] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarType, setSnackbarType] = useState("success");
  const [snackbarMessage, setSnackbarMessage] = useState("");


  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleCaptchaChange = (value) => {
    setCaptchaValue(value);
    if (value) {
      setErrorCaptcha(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // 1) Validación local
    let valid = true;
    if (!email.includes("@") || email.length < 5) {
      setErrorEmail(true);
      valid = false;
    } else {
      setErrorEmail(false);
    }
  
    if (password.length < 8) {
      setErrorPassword(true);
      valid = false;
    } else {
      setErrorPassword(false);
    }
  
    if (!captchaValue) {
      setErrorCaptcha(true);
      valid = false;
    } else {
      setErrorCaptcha(false);
    }
  
    // Si falla la validación local, resetea reCAPTCHA y sale sin Snackbar
    if (!valid) {
      captchaRef.current?.reset();
      setCaptchaValue(null);
      return;
    }
  
    // 2) Envío al servidor
    try {
      const { data } = await axios.post(`${API_URL}/api/login`, {
        email,
        password,
        tokenCaptcha: captchaValue,
      });
  
      // Login correcto: redirige según roleId
      const { roleId, message } = data;
      setSnackbarType("success");
      setSnackbarMessage(message);
      setOpenSnackbar(true);
  
      setTimeout(() => {
        if (roleId === 2) {
          window.location.href = "/panel-admin";  // Admin
        } else {
          window.location.href = "/perfil"; // Agremiado
        }
      }, 1000);
  
    } catch (err) {
      // Error del servidor o captcha inválido
      const serverError = err.response?.data?.error || "Error en login";
      setSnackbarType("error");
      setSnackbarMessage(serverError);
      setOpenSnackbar(true);
  
      // Siempre resetea reCAPTCHA tras cualquier fallo
      captchaRef.current?.reset();
      setCaptchaValue(null);
    }
  };
  
  

  return (
    <Container
      maxWidth="xs"
      sx={{
        mt: 20,
        mb: 10,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Paper
        elevation={5}
        sx={{
          p: 3,
          borderRadius: 2,
          textAlign: "center",
          boxShadow: "0px 6px 12px rgba(0, 0, 0, 0.2)",
          width: "85%",
          maxWidth: "280px",
        }}
      >
        <Typography variant="h6" fontWeight="bold" sx={{ color: "#2e7d32" }}>
          Iniciar Sesión
        </Typography>

        <Box component="form" sx={{ mt: 2 }} onSubmit={handleSubmit}>
          <TextField
            fullWidth
            size="small"
            label="Correo Electrónico"
            variant="outlined"
            margin="dense"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errorEmail}
            helperText={errorEmail ? "Ingrese un correo válido" : ""}
            sx={inputStyles}
          />

          <TextField
            fullWidth
            size="small"
            label="Contraseña"
            variant="outlined"
            margin="dense"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errorPassword}
            helperText={errorPassword ? "Debe tener al menos 8 caracteres" : ""}
            sx={inputStyles}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleTogglePassword} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Box
            sx={{
              mt: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Box sx={{ transform: "scale(0.9)", transformOrigin: "center" }}>
              <ReCAPTCHA
              ref={captchaRef}
                sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
                onChange={handleCaptchaChange}
              />
            </Box>
            {errorCaptcha && (
              <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                Por favor, verifica que no eres un robot.
              </Typography>
            )}
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="success"
            sx={{ mt: 2, py: 1.2 }}
          >
            Ingresar
          </Button>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2">
              ¿No tienes una cuenta?{" "}
              <Link
                component={RouterLink}
                to="/registro"
                variant="body2"
                sx={{ color: "#2e7d32" }}
              >
                Regístrate
              </Link>
            </Typography>
            <Typography variant="body2">
              
              <Link
                component={RouterLink} to="/recuperar-contrasena" variant="body2"  sx={{ color: "#2e7d32" }}
              >
              ¿Olvidaste tu contraseña?
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{ top: 150 }}
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
      >
        <Alert onClose={() => setOpenSnackbar(false)} severity={snackbarType} sx={{ width: "100%" }}>
          {snackbarType === "success" ? "Inicio de sesión exitoso" : "Error en los datos ingresados o ReCAPTCHA no verificado"}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Login;