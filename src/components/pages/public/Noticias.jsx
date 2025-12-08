// src/pages/public/Noticias.jsx

import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Grid,
  TextField,
  IconButton,
  InputAdornment,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  CardActions,
  Button,
  Menu,
  MenuItem,
  Fade,
  Snackbar,
  Alert
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import SearchIcon from "@mui/icons-material/Search";
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import "animate.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../../../config/apiConfig";
import { getCachedNoticias } from "../../utils/storage";

function ImageCarousel({ images, height = 130 }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [imgError, setImgError] = useState(false);
  
  const next = () => {
    setIdx(i => (i === images.length - 1 ? 0 : i + 1));
    setImgError(false);
  };
  const prev = () => {
    setIdx(i => (i === 0 ? images.length - 1 : i - 1));
    setImgError(false);
  };

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 10000);
    return () => clearInterval(timer);
  }, [images.length, paused]);

  // Imagen de fallback si falla la carga
  const handleImageError = () => {
    console.warn('⚠️ Error al cargar imagen:', images[idx]);
    setImgError(true);
  };

  return (
    <Box 
      sx={{ position: 'relative', width: '100%', height }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {imgError ? (
        <Box
          sx={{
            width: '100%',
            height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#f0f0f0',
            borderRadius: 1
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Imagen no disponible
          </Typography>
        </Box>
      ) : (
        <Box
          component="img"
          src={images[idx]}
          alt=""
          onError={handleImageError}
          sx={{
            width: '100%',
            height,
            objectFit: 'cover',
            borderRadius: 1
          }}
        />
      )}
      {images.length > 1 && !imgError && (
        <>
          <IconButton
            onClick={prev}
            sx={{
              position: 'absolute',
              top: '50%',
              left: 8,
              transform: 'translateY(-50%)',
              bgcolor: 'rgba(0,0,0,0.3)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' }
            }}
            size="small"
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <IconButton
            onClick={next}
            sx={{
              position: 'absolute',
              top: '50%',
              right: 8,
              transform: 'translateY(-50%)',
              bgcolor: 'rgba(0,0,0,0.3)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' }
            }}
            size="small"
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </>
      )}
    </Box>
  );
}

const Noticias = () => {
  const navigate = useNavigate();
  const [newsList, setNewsList] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Más reciente");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info"
  });

  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);
  
  const handleFilterClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleFilterClose = () => {
    setAnchorEl(null);
  };

  const filterOptions = ["Más reciente", "Última semana", "Último mes"];

  const handleFilterSelect = (option) => {
    setFilter(option);
    setAnchorEl(null);
    setSnackbar({
      open: true,
      message: `Filtrando por: ${option}`,
      severity: "info"
    });
  };

  useEffect(() => {
    // Cargar noticias
    const loadNoticias = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/noticias/publicados`);
        const adapt = data.map(n => ({
          id: n.id,
          title: n.titulo,
          description: n.descripcion,
          date: n.fecha_publicacion.split('T')[0],
          images: JSON.parse(n.imagenes),
        }));
        setNewsList(adapt);
        
        // Precargar imágenes en background
        console.log('🖼️ Precargando imágenes de noticias...');
        adapt.forEach(noticia => {
          noticia.images.forEach(imgUrl => {
            const img = new Image();
            img.src = imgUrl;
          });
        });
      } catch (error) {
        console.log('⚠️ Error de red, intentando cache...');
        const cached = await getCachedNoticias();
        if (cached && cached.length > 0) {
          const adapt = cached.map(n => ({
            id: n.id,
            title: n.titulo,
            description: n.descripcion,
            date: n.fecha ? n.fecha.split('T')[0] : '',
            images: n.imagenes || [],
          }));
          setNewsList(adapt);
          console.log('✅ Noticias cargadas desde cache');
          setSnackbar({
            open: true,
            message: 'Mostrando noticias guardadas (modo offline)',
            severity: 'info'
          });
        } else {
          setSnackbar({
            open: true,
            message: 'No hay noticias disponibles offline',
            severity: 'warning'
          });
        }
      }
    };

    loadNoticias();
  }, []);

  const filteredNews = newsList.filter(news =>
    news.title.toLowerCase().includes(search.toLowerCase()) ||
    news.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenNews = (news) => {
    navigate(`/noticias/${news.id}`);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 15, mb: 6 }}>
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: "#000",
            fontFamily: "sans-serif",
          }}
        >
          Noticias
        </Typography>
        <Box
          sx={{
            height: 2,
            width: 120,
            bgcolor: "#2e7d32",
            mx: "auto",
            mt: 1,
          }}
        />
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Box sx={{ mb: 1.5, textAlign: "center" }}>
            <TextField
              size="small"
              label="Buscar noticias"
              variant="outlined"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#2e7d32" }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: "75%",
                "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                  {
                    borderColor: "#81c784",
                  },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: "#81c784",
                },
              }}
            />
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 1.5,
              justifyContent: "center",
            }}
          >
            <IconButton onClick={handleFilterClick}>
              <FilterListIcon sx={{ color: "#2e7d32" }} />
            </IconButton>
            <Typography variant="body2" sx={{ color: "#2e7d32" }}>
              {filter}
            </Typography>
          </Box>

          <Menu
            id="fade-menu"
            MenuListProps={{
              "aria-labelledby": "fade-button",
            }}
            anchorEl={anchorEl}
            open={openMenu}
            onClose={handleFilterClose}
            TransitionComponent={Fade}
          >
            {filterOptions.map((option) => (
              <MenuItem key={option} onClick={() => handleFilterSelect(option)}>
                {option}
              </MenuItem>
            ))}
          </Menu>

          <Box
            sx={{
              display: { xs: "none", md: "block" },
              maxHeight: 350,
              overflowY: "auto",
            }}
          >
            {filteredNews.map((news) => (
              <Card
                key={news.id}
                className="animate__animated animate__fadeInUp"
                sx={{
                  mb: 1.5,
                  width: "75%",
                  mx: "auto",
                  display: "flex",
                  alignItems: "center",
                  p: 0.5,
                }}
              >
                <CardActionArea onClick={() => handleOpenNews(news)}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <CardMedia
                      component="img"
                      image={news.images[0]}
                      alt={news.title}
                      sx={{
                        width: 60,
                        height: 60,
                        mr: 1,
                        transition: "transform 0.3s",
                        "&:hover": {
                          transform: "scale(1.05)",
                        },
                      }}
                    />
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: "normal", fontSize: "0.75rem" }}
                      >
                        {news.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {news.date}
                      </Typography>
                    </Box>
                  </Box>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        </Grid>

        <Grid item xs={12} md={9}>
          <Box sx={{ maxHeight: { xs: "none", md: 600 }, overflowY: "auto" }}>
            <Grid container spacing={2}>
              {filteredNews.map((news) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={4}
                  key={news.id}
                  sx={{
                    display: "flex",
                    justifyContent: { xs: "center", md: "flex-start" },
                  }}
                >
                  <Card
                    className="animate__animated animate__fadeInUp"
                    sx={{
                      maxWidth: 320,
                      height: 335,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <CardActionArea
                      onClick={() => handleOpenNews(news)}
                      sx={{ flexGrow: 1 }}
                    >
                      <ImageCarousel images={news.images} height={130} />
                      <CardContent>
                        <Typography
                          gutterBottom
                          variant="body2"
                          component="div"
                          sx={{ fontSize: '0.8rem' }}
                        >
                          {news.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            fontSize: "0.7rem",
                            fontWeight: "normal",
                            display: "-webkit-box",
                            WebkitLineClamp: 4,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {news.description}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          sx={{ mt: 0.5 }}
                        >
                          {news.date}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                    <CardActions>
                      <Button
                        size="small"
                        color="success"
                        onClick={() => handleOpenNews(news)}
                      >
                        Ver más
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Grid>
      </Grid>

      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{ top: 250 }}
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Noticias;