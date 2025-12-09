import React, { useState, useEffect, useRef } from "react";

import axios from "axios";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  IconButton,
  Link,
  useMediaQuery,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import ReCAPTCHA from "react-google-recaptcha";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { API_URL } from "../../../config/apiConfig";

const steps = [
  "Validación de Correo y Datos Básicos",
  "Contraseña",
  "Código de Verificación",
  "Información Personal",
  "Información Laboral",
];

const Registro = () => {
  const inputStyles = {
    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#81c784",
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: "#81c784",
    },
  };
  const captchaRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Paso 0: Datos básicos
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState(null);
  const [captchaValue, setCaptchaValue] = useState(null);

  // Paso 1: Contraseña
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    length: false,
    lowercase: false,
    uppercase: false,
    number: false,
    special: false,
    commonPatterns: true,
  });
  

  const getPasswordStrength = (pwd) => {
    const strength = {
      length: pwd.length >= 8,
      lowercase: /[a-z]/.test(pwd),
      uppercase: /[A-Z]/.test(pwd),
      number: /\d/.test(pwd),
      special: /[@$!%*?&]/.test(pwd),
      commonPatterns: !pwd || !/(.)\1{2,}|123|abc|password/i.test(pwd),
      score: 0,
    };
    let score = 0;
    if (strength.length) score++;
    if (strength.lowercase) score++;
    if (strength.uppercase) score++;
    if (strength.number) score++;
    if (strength.special) score++;
    strength.score = Math.min(score, 4);
    return strength;
  };

  useEffect(() => {
    setPasswordStrength(getPasswordStrength(password));
  }, [password]);

  // Paso 2: Código de verificación
  const [verificationCode, setVerificationCode] = useState("");
  const [counter, setCounter] = useState(30);

  // Paso 3: Información Personal
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [maternalLastName, setMaternalLastName] = useState("");
  const [gender, setGender] = useState("");
  const [curp, setCurp] = useState("");
  const [phone, setPhone] = useState("");

  // Paso 4: Información Laboral
  const [universityOrigin, setUniversityOrigin] = useState("");
  const [universityPosition, setUniversityPosition] = useState("");
  const [educationalProgram, setEducationalProgram] = useState("");
  const [workerNumber, setWorkerNumber] = useState("");
  const [educationalLevel, setEducationalLevel] = useState("");
  const [antiguedad, setAntiguedad] = useState(null);


   // Catálogos
   const [universidades, setUniversidades] = useState([]);
   const [puestos, setPuestos] = useState([]);
   const [programas, setProgramas] = useState([]);
   const [niveles, setNiveles] = useState([]);

  // Errores y snackbar
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÜüÑñ\s]+$/;

   // Cargar catálogos al montar
   useEffect(() => {
    axios.get(`${API_URL}/api/registro/universidades`)
      .then(res => setUniversidades(res.data))
      .catch(console.error);
    axios.get(`${API_URL}/api/registro/puestos`)
      .then(res => setPuestos(res.data))
      .catch(console.error);
    axios.get(`${API_URL}/api/registro/programas`)
      .then(res => setProgramas(res.data))
      .catch(console.error);
    axios.get(`${API_URL}/api/registro/niveles`)
      .then(res => setNiveles(res.data))
      .catch(console.error);
  }, []);
  
  // Temporizador de Paso 2
  useEffect(() => {
    if (activeStep === 2) {
      setCounter(30);
      const timer = setInterval(() => {
        setCounter((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeStep]);

  // Scroll al cambiar de paso
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeStep]);

  const toggleShowPassword = () => setShowPassword((prev) => !prev);
  const toggleShowConfirmPassword = () => setShowConfirmPassword((prev) => !prev);

  const handleBack = () => activeStep > 0 && setActiveStep(activeStep - 1);
  const handleResendCode = () => {
    setCounter(30);
    setSnackbar({ open: true, message: "Código reenviado correctamente.", severity: "info" });
  };

  const handleNext = async () => {
    let newErrors = {};
// Paso 0: validación local
if (activeStep === 0) {
  // validación de correo/fecha...
  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    captchaRef.current?.reset();
    setCaptchaValue(null);
    return;
  }
  setErrors({});

  // 1) Validar reCAPTCHA en backend
  try {
    await axios.post(`${API_URL}/api/registro/validarCaptcha`, { tokenCaptcha: captchaValue });
  } catch (err) {
    setErrors({ captcha: "reCAPTCHA inválido." });
    captchaRef.current?.reset();    // <-- aquí también
    setCaptchaValue(null);
    return;
  }

  // 2) Validar existencia / preregistro del usuario
  try {
    await axios.post(`${API_URL}/api/registro/validarUsuario`, {
      correo_electronico: email,
      fecha_nacimiento: dateOfBirth.format("YYYY-MM-DD"),
    });
    setErrors({});
    setActiveStep(1);
  } catch (err) {
    if (err.response?.status === 400 && err.response.data.registered) {
      setErrors({ email: "Usuario ya completó el registro." });
    } else if (err.response?.status === 404) {
      setErrors({ email: "Usuario no registrado en el sindicato." });
    } else {
      setErrors({ email: "Error validando usuario." });
    }
    captchaRef.current?.reset();    // <-- y aquí también
    setCaptchaValue(null);
    return;
  }
}


  // Paso 1: validar contraseña y enviar OTP
  if (activeStep === 1) {
    let newErrors = {};
  
    // 1) Validación local de formato
    const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!pwdRegex.test(password)) {
      newErrors.password =
        "La contraseña debe tener mayúscula, minúscula, número y un carácter especial.";
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden.";
    }

    // Si hay errores locales, abortamos
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    // 2) Verificar en el backend si la contraseña está comprometida
    try {
      await axios.post(`${API_URL}/api/registro/checkPasswordCompromised`, {
        password,
      });
    } catch (err) {
      // El endpoint devuelve 400 con { error: "..." }
      setErrors({ password: err.response?.data?.error || "Contraseña comprometida." });
      return;
    }
      // 3) Enviar OTP al correo
    try {
      await axios.post(`${API_URL}/api/registro/enviarCodigo`, {
        correo_electronico: email,
        fecha_nacimiento: dateOfBirth.format("YYYY-MM-DD"),
      });
      setSnackbar({
        open: true,
        message: "Código enviado a tu correo.",
        severity: "info",
      });
      setActiveStep(2);
    } catch (err) {
      setSnackbar({
        open: true,
        message:
          err.response?.data?.error || "Error al enviar código.",
        severity: "error",
      });
    }
    return;
  }else if (activeStep === 2) {
    // 1) validación local rápida
    if (!/^\d{6}$/.test(verificationCode)) {
      setErrors({ verificationCode: "El código debe tener 6 dígitos numéricos." });
      return;
    }
    setErrors({});
  
    // 2) validación remota
    try {
      await axios.post(`${API_URL}/api/registro/validarCodigo`, {
        correo_electronico: email,
        codigo: verificationCode,
      });
      // si todo OK, avanzamos
      setSnackbar({ open: true, message: "Código verificado correctamente.", severity: "success" });
      setActiveStep(activeStep + 1);
    } catch (err) {
      // 400: expirado o incorrecto
      const msg =
        err.response?.data?.error === "El código ha expirado"
          ? "El código ha expirado."
        : err.response?.data?.error === "Código incorrecto"
          ? "El código no coincide."
        : "Error validando código.";
      setErrors({ verificationCode: msg });
    }
  }
  if (activeStep === 3) {
    if (!firstName || firstName.length < 4 || !nameRegex.test(firstName))       newErrors.firstName       = "Ingrese un nombre válido (mínimo 4 letras).";
    if (!lastName  || lastName.length  < 4 || !nameRegex.test(lastName))        newErrors.lastName        = "Ingrese un apellido paterno válido (mínimo 4 letras).";
    if (!maternalLastName || maternalLastName.length < 4 || !nameRegex.test(maternalLastName))
                                                                                 newErrors.maternalLastName = "Ingrese un apellido materno válido (mínimo 4 letras).";
    if (!gender)                                                                 newErrors.gender          = "Seleccione su género.";
    if (!/^[A-ZÑ]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/i.test(curp))                    newErrors.curp            = "El CURP debe tener 18 caracteres y formato válido.";
    if (!/^\d{10}$/.test(phone))                                                  newErrors.phone          = "El teléfono debe tener 10 dígitos.";

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    // avanzamos al paso 4
    setActiveStep(4);
    return;
  }

  // Paso 4: Información Laboral + envío final al backend
  if (activeStep === 4) {
    if (!universityOrigin) newErrors.universityOrigin = "Seleccione su universidad.";
    if (!universityPosition) newErrors.universityPosition = "Seleccione su puesto.";
    if ((universityPosition === "Docente" || universityPosition === "Director de carrera") && !educationalProgram)
      newErrors.educationalProgram = "Seleccione el programa educativo.";
    if (!/^[0-9]+$/.test(workerNumber)) newErrors.workerNumber = "El número de trabajador debe ser numérico.";
    if (!educationalLevel) newErrors.educationalLevel = "Seleccione su nivel educativo.";
    if (!antiguedad) {
      newErrors.antiguedad = "Seleccione su fecha de antigüedad.";
    } else if (antiguedad.year() < 2019) {
      newErrors.antiguedad = "La fecha de antigüedad no puede ser menor a 2019.";
    }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    try {
      // Llamada al endpoint para guardar TODO el registro
      await axios.post(`${API_URL}/api/registro/actualizarUsuario`, {
        correo_electronico: email,
        password,
        firstName,
        lastName,
        maternalLastName,
        gender,
        curp,
        phone,
        universityOrigin,
        universityPosition,
        educationalProgram,
        workerNumber,
        educationalLevel,
       antiguedad: antiguedad ? antiguedad.format("YYYY-MM-DD") : null
      });

      setSnackbar({ open: true, message: "Registro completado con éxito.", severity: "success" });
      // redirigimos al login un momento después
      setTimeout(() => window.location.href = "/login", 1000);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || "Error al finalizar el registro.",
        severity: "error",
      });
      setIsSubmitting(false);
    }

    return;
  }
};
  

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField fullWidth size="small" label="Correo Electrónico" variant="outlined" margin="dense" value={email} onChange={(e) => setEmail(e.target.value)} error={Boolean(errors.email)} helperText={errors.email} sx={inputStyles} />
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker label="Fecha de Nacimiento" value={dateOfBirth} onChange={(val) => setDateOfBirth(val)} slotProps={{ textField: { fullWidth: true, margin: "dense", error: Boolean(errors.dateOfBirth), helperText: errors.dateOfBirth, sx: inputStyles } }} />
            </LocalizationProvider>
            <Box sx={{ mt: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Box sx={{ transform: "scale(0.9)", transformOrigin: "center" }}><ReCAPTCHA  ref={captchaRef} sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY} onChange={(val) => { setCaptchaValue(val); setErrors((p) => ({ ...p, captcha: undefined })); }} /></Box>
              {errors.captcha && <Typography variant="caption" color="error" sx={{ mt: 1 }}>{errors.captcha}</Typography>}
            </Box>
          </Box>
        );
      case 1:
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField fullWidth size="small" label="Contraseña" type={showPassword ? "text" : "password"} variant="outlined" margin="dense" value={password} onChange={(e) => setPassword(e.target.value)} error={Boolean(errors.password)} helperText={errors.password} sx={inputStyles} onFocus={() => setShowPasswordRequirements(true)} onBlur={() => setShowPasswordRequirements(false)} InputProps={{ endAdornment: (<InputAdornment position="end"><IconButton onClick={toggleShowPassword}>{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>) }} />
            {showPasswordRequirements && (<Box className="password-strength-display"><Box className="password-strength-bar"><Typography className="password-strength-text">{["Muy Débil","Débil","Regular","Fuerte","Muy Fuerte"][passwordStrength.score]}</Typography><Box sx={{ width: `${passwordStrength.score * 16}%`, height: 10, transition: "width 0.3s ease-in-out", backgroundColor: passwordStrength.score < 2 ? "red" : passwordStrength.score < 3 ? "orange" : passwordStrength.score < 4 ? "yellow" : "green" }} /></Box><Box className="password-requirements">{[[passwordStrength.length, "Mínimo 8 caracteres"],[passwordStrength.lowercase, "Al menos una letra minúscula"],[passwordStrength.uppercase, "Al menos una letra mayúscula"],[passwordStrength.number, "Al menos un número"],[passwordStrength.special, "Al menos un carácter especial"],[passwordStrength.commonPatterns, "No usar patrones comunes"]].map(([valid, text], i) => (<Typography key={i} className={valid ? "valid" : "invalid"} sx={{ fontSize: "0.8rem", margin: "0.2rem 0" }}>{text}</Typography>))}</Box></Box>)}
            <TextField fullWidth size="small" label="Confirmar Contraseña" type={showConfirmPassword ? "text" : "password"} variant="outlined" margin="dense" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} error={Boolean(errors.confirmPassword)} helperText={errors.confirmPassword} sx={inputStyles} InputProps={{ endAdornment: (<InputAdornment position="end"><IconButton onClick={toggleShowConfirmPassword}>{showConfirmPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>) }} />
          </Box>
        );
      case 2:
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField fullWidth size="small" label="Código de Verificación" variant="outlined" margin="dense" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} error={Boolean(errors.verificationCode)} helperText={errors.verificationCode} sx={inputStyles} />
            <Typography variant="body2" align="center">Se ha enviado un código a su correo electrónico.</Typography>
            {counter > 0 ? (<Typography variant="caption" align="center">Reenviar código en {counter} segundos.</Typography>) : (<Button variant="outlined" onClick={handleResendCode}>Reenviar Código</Button>)}
          </Box>
        );
      case 3:
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField fullWidth size="small" label="Nombre" variant="outlined" margin="dense" value={firstName} onChange={(e) => setFirstName(e.target.value)} error={Boolean(errors.firstName)} helperText={errors.firstName} sx={inputStyles} />
            <TextField fullWidth size="small" label="Apellido Paterno" variant="outlined" margin="dense" value={lastName} onChange={(e) => setLastName(e.target.value)} error={Boolean(errors.lastName)} helperText={errors.lastName} sx={inputStyles} />
            <TextField fullWidth size="small" label="Apellido Materno" variant="outlined" margin="dense" value={maternalLastName} onChange={(e) => setMaternalLastName(e.target.value)} error={Boolean(errors.maternalLastName)} helperText={errors.maternalLastName} sx={inputStyles} />
            <FormControl fullWidth margin="dense" error={Boolean(errors.gender)} sx={inputStyles}><InputLabel>Género</InputLabel><Select value={gender} label="Género" onChange={(e) => setGender(e.target.value)}><MenuItem value="Masculino">Masculino</MenuItem><MenuItem value="Femenino">Femenino</MenuItem><MenuItem value="Otro">Otro</MenuItem></Select>{errors.gender && <Typography variant="caption" color="error">{errors.gender}</Typography>}</FormControl>
            <TextField fullWidth size="small" label="CURP" variant="outlined" margin="dense" value={curp} onChange={(e) => setCurp(e.target.value)} error={Boolean(errors.curp)} helperText={errors.curp} sx={inputStyles} />
            <TextField fullWidth size="small" label="Número de Teléfono" variant="outlined" margin="dense" value={phone} onChange={(e) => setPhone(e.target.value)} error={Boolean(errors.phone)} helperText={errors.phone} sx={inputStyles} />
          </Box>
        );
      case 4:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth margin='dense' error={Boolean(errors.universityOrigin)} sx={inputStyles}>
              <InputLabel>Universidad de Procedencia</InputLabel>
              <Select value={universityOrigin} label='Universidad de Procedencia' onChange={e => setUniversityOrigin(e.target.value)}>
                {universidades.map(u => (<MenuItem key={u.id} value={u.id}>{u.nombre}</MenuItem>))}
              </Select>
              {errors.universityOrigin && <Typography variant='caption' color='error'>{errors.universityOrigin}</Typography>}
            </FormControl>

            <FormControl fullWidth margin='dense' error={Boolean(errors.universityPosition)} sx={inputStyles}>
              <InputLabel>Puesto en la Universidad</InputLabel>
              

              <Select value={universityPosition} label='Puesto en la Universidad' onChange={e => setUniversityPosition(e.target.value)}>
   {puestos.map(p => (
 <MenuItem key={p.id} value={p.id}>
       {p.nombre}     </MenuItem>
  ))}
  </Select>
              {errors.universityPosition && <Typography variant='caption' color='error'>{errors.universityPosition}</Typography>}
            </FormControl>

            {(universityPosition === 1 || universityPosition === 3) && (
  <FormControl
    fullWidth
    margin="dense"
    error={Boolean(errors.educationalProgram)}
    sx={inputStyles}
  >
    <InputLabel>Programa Educativo</InputLabel>
    <Select
      value={educationalProgram}
      label="Programa Educativo"
      onChange={(e) => setEducationalProgram(e.target.value)}
    >
      {programas.map((pr) => (
        <MenuItem key={pr.id} value={pr.id}>
          {pr.nombre}
        </MenuItem>
      ))}
    </Select>
    {errors.educationalProgram && (
      <Typography variant="caption" color="error">
        {errors.educationalProgram}
      </Typography>
    )}
  </FormControl>
   
)}


            <TextField
              fullWidth size='small' label='Número de Trabajador' margin='dense' variant='outlined'
              value={workerNumber} onChange={e => setWorkerNumber(e.target.value)} error={Boolean(errors.workerNumber)} helperText={errors.workerNumber} sx={inputStyles}
            />

            <FormControl fullWidth margin='dense' error={Boolean(errors.educationalLevel)} sx={inputStyles}>
              <InputLabel>Nivel Educativo</InputLabel>
              <Select value={educationalLevel} label='Nivel Educativo' onChange={e => setEducationalLevel(e.target.value)}>
                {niveles.map(n => (<MenuItem key={n.id} value={n.id}>{n.nombre}</MenuItem>))}
              </Select>
              {errors.educationalLevel && <Typography variant='caption' color='error'>{errors.educationalLevel}</Typography>}
            </FormControl>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Fecha de Antigüedad"
                value={antiguedad}
                onChange={(val) => setAntiguedad(val)}
                minDate={dayjs("2019-01-01")}
                maxDate={dayjs()}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: "dense",
                    error: Boolean(errors.antiguedad),
                    helperText: errors.antiguedad,
                    sx: inputStyles
                  }
                }}
              />
            </LocalizationProvider>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <style>{`
        .password-strength-display {  margin-top: -1rem; margin-bottom: 1rem; width: 90%; background-color: #ded9d4; padding: 1rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #c6ff80;
        }
        .password-strength-bar { margin-bottom: 0.5rem; }
        .password-strength-text { font-size: 0.9rem; margin-bottom: 0.5rem; }
        .password-requirements p { font-size: 0.8rem; font-weight: 300; margin: 0.2rem 0; }
        .invalid { color: red; } .valid { color: green; }
      `}</style>
      <Container maxWidth="xs" sx={{ mt: 20, mb: 5 }}>
        <Paper elevation={5} sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="h5" fontWeight="bold" align="center" gutterBottom sx={{ color: "#2e7d32" }}>Registro</Typography>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3, "& .MuiStepIcon-root.Mui-active": { color: "#2e7d32" }, "& .MuiStepIcon-root.Mui-completed": { color: "#2e7d32" }, "& .MuiStepLabel-label": { fontSize: "0.7rem" } }}>
            {steps.map((label) => <Step key={label}><StepLabel>{isMobile ? "" : label}</StepLabel></Step>)}
          </Stepper>
          <form>
            {renderStepContent(activeStep)}
            <Box sx={{ display: "flex", justifyContent: activeStep > 0 ? "space-between" : "center", mt: 3 }}>
              {activeStep > 0 && <Button variant="contained" onClick={handleBack} size="small" sx={{ backgroundColor: "#9e9e9e", '&:hover': { backgroundColor: "#757575" } }}>Anterior</Button>}
              <Button variant="contained" color="success" onClick={handleNext} size="small" disabled={isSubmitting && activeStep === steps.length - 1}>{activeStep === steps.length - 1 ? 'Registrarse' : 'Siguiente'}</Button>
            </Box>
            {activeStep === 0 && (<Box sx={{ mt: 2, textAlign: "center" }}><Typography variant="body2">¿Ya tienes una cuenta? <Link component={RouterLink} to="/login" variant="body2" sx={{ color: "#2e7d32" }}>Inicia sesión</Link></Typography></Box>)}
          </form>
        </Paper>
       
        <Snackbar anchorOrigin={{ vertical: "top", horizontal: "right" }} open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} sx={{ top: 150 }}>
          <Alert onClose={() => setSnackbar((p) => ({ ...p, open: false }))} severity={snackbar.severity}>{snackbar.message}</Alert>
        </Snackbar>
      </Container>
    </>
  );
};

export default Registro;