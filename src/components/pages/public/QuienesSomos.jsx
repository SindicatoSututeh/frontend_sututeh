// src/pages/public/QuienesSomos.jsx

import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Slide,
  Dialog,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import axios from "axios";
import { API_URL } from "../../../config/apiConfig";
import { getCachedResponse } from "../../utils/storage";
import "animate.css";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const getInitials = (fullName) => {
  const parts = fullName.trim().split(" ").filter(p => p.length > 0);
  return parts.map(p => p.charAt(0)).join("").toUpperCase();
};

const buildPyramidRows = (items) => {
  const rows = [];
  let startIndex = 0;
  let nextRowSize = 1;

  while (startIndex < items.length) {
    const slice = items.slice(startIndex, startIndex + nextRowSize);
    rows.push(slice);
    startIndex += nextRowSize;
    nextRowSize += 1;
  }

  return rows;
};

export default function QuienesSomos() {
  const [qs, setQs] = useState(null);
  const [allPuestos, setAllPuestos] = useState([]);
  const [selectedPuesto, setSelectedPuesto] = useState(null);

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    // Cargar "Quiénes Somos"
    const loadQuienesSomos = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/nosotros/vigentes`);
        const quien = data.find(
          (r) => r.seccion === "Quiénes Somos" && r.estado === "Vigente"
        );
        setQs(quien);
      } catch (error) {
        console.log('⚠️ Error de red, intentando cache...');
        const cached = await getCachedResponse(`${API_URL}/api/nosotros/vigentes`);
        if (cached) {
          const quien = cached.find(
            (r) => r.seccion === "Quiénes Somos" && r.estado === "Vigente"
          );
          setQs(quien);
          console.log('✅ Quiénes Somos cargados desde cache');
        }
      }
    };

    loadQuienesSomos();
  }, []);

  useEffect(() => {
    // Cargar puestos
    const loadPuestos = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/puestos`);
        const mapped = data.map((row) => {
          let fullName = "";
          if (row.usuario_id) {
            fullName = `${row.usuario_nombre} ${row.usuario_apellido_paterno} ${row.usuario_apellido_materno || ""}`.trim();
          }
          return {
            puestoId: row.puesto_id,
            role: row.puesto_nombre,
            user: row.usuario_id
              ? {
                  id: row.usuario_id,
                  fullName,
                }
              : null,
          };
        });
        setAllPuestos(mapped);
      } catch (error) {
        console.log('⚠️ Error de red, intentando cache...');
        const cached = await getCachedResponse(`${API_URL}/api/puestos`);
        if (cached) {
          const mapped = cached.map((row) => {
            let fullName = "";
            if (row.usuario_id) {
              fullName = `${row.usuario_nombre} ${row.usuario_apellido_paterno} ${row.usuario_apellido_materno || ""}`.trim();
            }
            return {
              puestoId: row.puesto_id,
              role: row.puesto_nombre,
              user: row.usuario_id
                ? {
                    id: row.usuario_id,
                    fullName,
                  }
                : null,
            };
          });
          setAllPuestos(mapped);
          console.log('✅ Puestos cargados desde cache');
        }
      }
    };

    loadPuestos();
  }, []);

  const handleOpenDetalle = (puestoObj) => {
    setSelectedPuesto(puestoObj);
  };
  const handleCloseDetalle = () => {
    setSelectedPuesto(null);
  };

  const comiteEjecutivo = allPuestos.slice(0, 10);
  const comisionVHJ = allPuestos.slice(10, 20);

  const filasComite = buildPyramidRows(comiteEjecutivo);
  const filasComision = [];
  let start = 0;
  const tamaños = [1, 1, 2, 3, 4];
  for (let t of tamaños) {
    if (start >= comisionVHJ.length) break;
    filasComision.push(comisionVHJ.slice(start, start + t));
    start += t;
  }
  if (start < comisionVHJ.length) {
    filasComision.push(comisionVHJ.slice(start));
  }

  return (
    <>
      <Box sx={{ backgroundColor: "#fff", py: { xs: 5, md: 8 } }}>
        <Container maxWidth="md">
          <Grid
            container
            spacing={4}
            alignItems="flex-start"
            justifyContent="center"
            sx={{ flexDirection: { xs: "column", md: "row" } }}
          >
            <Grid
              item
              xs={12}
              md={6}
              className="animate__animated animate__fadeInLeft"
            >
              <Box sx={{ textAlign: { xs: "center", md: "left" } }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: "bold",
                    color: "#000",
                    fontFamily: "sans-serif",
                  }}
                  gutterBottom
                >
                  ¿Quiénes Somos?
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    mt: 2,
                    fontFamily: "sans-serif",
                    lineHeight: 1.6,
                  }}
                >
                  {qs?.contenido || "Cargando quiénes somos…"}
                </Typography>
              </Box>
            </Grid>

            <Grid
              item
              xs={12}
              md={6}
              className="animate__animated animate__fadeInRight"
            >
              <Box
                component="img"
                src={qs?.img || "/img/img.jpg"}
                alt="Imagen Quienes Somos"
                sx={{
                  width: "100%",
                  height: { xs: 300, md: 400 },
                  boxShadow: 3,
                  objectFit: "cover",
                }}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box sx={{ backgroundColor: "#f7f7f7", py: { xs: 3, md: 5 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 2 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                fontFamily: "sans-serif",
                textAlign: "center",
              }}
            >
              Estructura Organizacional
            </Typography>
          </Box>

          <Typography
            variant="subtitle1"
            sx={{
              mb: 1,
              fontFamily: "sans-serif",
              textAlign: "center",
            }}
          >
            Comité Ejecutivo
          </Typography>

          {filasComite.map((fila, rowIndex) => (
            <Box
              key={"comite-row-" + rowIndex}
              sx={{ mb: rowIndex < filasComite.length - 1 ? 1 : 2 }}
            >
              <Grid
                container
                justifyContent="center"
                spacing={2}
                sx={{
                  px: isSmallScreen ? 1 : 0,
                }}
              >
                {fila.map((item, idx) => {
                  const fullName = item.user ? item.user.fullName : "";
                  return (
                    <Grid item key={"comite-" + rowIndex + "-" + idx}>
                      <Paper
                        sx={{
                          p: 1,
                          textAlign: "center",
                          borderRadius: 2,
                          backgroundColor: "#fff",
                          boxShadow: 2,
                          minWidth: 160,
                          fontFamily: "sans-serif",
                        }}
                        onClick={() => handleOpenDetalle(item)}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            mb: 0.5,
                          }}
                        >
                          {item.role}
                        </Typography>

                        {item.user ? (
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              mt: 0.5,
                            }}
                          >
                            <Typography variant="caption">{fullName}</Typography>
                          </Box>
                        ) : (
                          <Typography
                            variant="caption"
                            sx={{ mt: 1, color: "#999" }}
                          >
                            Sin asignar
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>

              {rowIndex < filasComite.length - 1 && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    mt: 0.5,
                    mb: 0.5,
                  }}
                >
                  <ArrowDownwardIcon fontSize="small" />
                </Box>
              )}
            </Box>
          ))}

          <Typography
            variant="subtitle1"
            sx={{
              mt: 3,
              mb: 1,
              fontFamily: "sans-serif",
              textAlign: "center",
            }}
          >
            Comisión de Vigilancia, Honor y Justicia
          </Typography>

          {filasComision.map((fila, rowIndex) => (
            <Box
              key={"comision-row-" + rowIndex}
              sx={{ mb: rowIndex < filasComision.length - 1 ? 1 : 0 }}
            >
              <Grid
                container
                justifyContent="center"
                spacing={2}
                sx={{
                  px: isSmallScreen ? 1 : 0,
                }}
              >
                {fila.map((item, idx) => {
                  const fullName = item.user ? item.user.fullName : "";
                  return (
                    <Grid item key={"comision-" + rowIndex + "-" + idx}>
                      <Paper
                        sx={{
                          p: 1,
                          textAlign: "center",
                          borderRadius: 2,
                          backgroundColor: "#fff",
                          boxShadow: 2,
                          minWidth: 160,
                          fontFamily: "sans-serif",
                        }}
                        onClick={() => handleOpenDetalle(item)}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, mb: 0.5 }}
                        >
                          {item.role}
                        </Typography>

                        {item.user ? (
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              mt: 0.5,
                            }}
                          >
                            <Typography variant="caption">{fullName}</Typography>
                          </Box>
                        ) : (
                          <Typography
                            variant="caption"
                            sx={{ mt: 1, color: "#999" }}
                          >
                            Sin asignar
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>

              {rowIndex < filasComision.length - 1 && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    mt: 0.5,
                    mb: 0.5,
                  }}
                >
                  <ArrowDownwardIcon fontSize="small" />
                </Box>
              )}
            </Box>
          ))}
        </Container>
      </Box>
    </>
  );
}