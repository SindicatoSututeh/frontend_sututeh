// src/components/GestionRoles.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Avatar,
  Menu,
  MenuItem,
  TextField,
  Grid,
  InputAdornment,
  Snackbar,
  Slide,
  Tooltip
} from '@mui/material';
import Alert from '@mui/material/Alert';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';

import { API_URL } from "../../../../config/apiConfig";

// ----------------------------------------------
// Transición para los diálogos tipo slide
// ----------------------------------------------
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// ----------------------------------------------
// Helper para obtener las iniciales de un nombre
// ----------------------------------------------
const getInitials = (fullName) => {
  const parts = fullName.trim().split(' ');
  return parts.map(p => p.charAt(0)).join('').toUpperCase();
};

// ----------------------------------------------
// Componente DraggableUser: muestra avatar + nombre
// Se puede arrastrar a un rol.
// ----------------------------------------------
function DraggableUser({ user }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `user-${user.id}`,
  });

  const fullName = `${user.nombre} ${user.apellido_paterno} ${user.apellido_materno}`;
  const containerStyle = {
    opacity: isDragging ? 0.5 : 1,
    padding: '8px',
    marginBottom: '8px',
    backgroundColor: '#e8f5e9',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center'
  };

  const dragHandleStyle = {
    cursor: 'grab',
    display: 'flex',
    alignItems: 'center',
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    transition: 'transform 0.2s ease'
  };

  return (
    <Box sx={containerStyle}>
      <Box ref={setNodeRef} {...listeners} {...attributes} sx={dragHandleStyle}>
        <Avatar
          sx={{ mr: 1, width: 32, height: 32 }}
          src={user.url_foto || undefined}
        >
          {!user.url_foto && getInitials(fullName)}
        </Avatar>
        {fullName}
      </Box>
    </Box>
  );
}

// ----------------------------------------------
// Componente DroppableRole: área donde soltar usuarios
// ----------------------------------------------
function DroppableRole({ role, children }) {
  const { isOver, setNodeRef } = useDroppable({ id: role.id });
  const style = {
    backgroundColor: isOver ? '#e0f7fa' : '#fafafa',
    padding: '8px',
    minHeight: '30px',
    border: '1px dashed #ccc',
    borderRadius: '4px',
    transition: 'background-color 0.3s ease',
    
  };
  return (
    <Box ref={setNodeRef} style={style}>
      {children}
    </Box>
  );
}

// ==============================================
// Componente principal: GestionRoles
// ==============================================
export default function GestionRoles() {
  // ----------------------------
  // Estados centrales
  // ----------------------------
  // Lista de usuarios sin asignar
  const [unassignedUsers, setUnassignedUsers] = useState([]);

  // Lista de "puestos" (traída de GET /api/puestos)
  // Cada elemento tendrá:
  //   { id: 'role-<dbId>', name, description, assignedUsers: [] }
  const [roles, setRoles] = useState([]);

  // Id del puesto que estamos editando
  const [editingRoleId, setEditingRoleId] = useState(null);
  // En edición, la lista temporal de assignedUsers
  const [editAssignedUsers, setEditAssignedUsers] = useState([]);

  // Para quitar usuario de un puesto con confirmación
  const [userToRemove, setUserToRemove] = useState(null);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  // Drag & drop
  const [activeDragGroup, setActiveDragGroup] = useState([]);

  // Búsqueda en "sin asignar"
  const [searchQuery, setSearchQuery] = useState("");

  // Modal de detalles de puesto (solo lectura)
  const [selectedRoleForModal, setSelectedRoleForModal] = useState(null);

  // Modal de Agregar / Editar puesto
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState('add'); // 'add' o 'edit'
  const [roleModalData, setRoleModalData] = useState({ name: '', description: '' });

  // Modal de confirmación para eliminar puesto
  const [deleteRoleModalOpen, setDeleteRoleModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  // Feedback (Snackbar + Alert)
  const [alert, setAlert] = useState({ open: false, severity: '', message: '' });
  const showAlert = (severity, message) => setAlert({ open: true, severity, message });
  const handleAlertClose = () => setAlert(prev => ({ ...prev, open: false }));

  // Menú de opciones (⋮) en cada puesto
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuRoleId, setMenuRoleId] = useState(null);

  // --------------------------------------
  // useEffect (montaje): 
  // - Cargar usuarios libres (GET /api/puestos/libres)
  // - Cargar todos los puestos (GET /api/puestos)
  // --------------------------------------
  // src/components/GestionRoles.jsx

useEffect(() => {
  // 1) Cargo los usuarios libres (igual que antes)
  axios.get(`${API_URL}/api/puestos/libres`)
    .then(res => {
      setUnassignedUsers(res.data);
    })
    .catch(err => {
      console.error('Error al traer usuarios libres:', err);
      showAlert('error', 'No se pudieron cargar usuarios sin asignar.');
    });

  // 2) Cargo todos los puestos CON el usuario asignado (si lo hay)
  axios.get(`${API_URL}/api/puestos`)
    .then(res => {
      // Cada elemento 'row' ya trae: 
      //   puesto_id, puesto_nombre, puesto_responsabilidad,
      //   usuario_id, usuario_nombre, usuario_apellido_paterno, usuario_apellido_materno, usuario_url_foto
      const fetched = res.data.map(row => {
        // Construyo el objeto del usuario asignado, si existe:
        let assignedUsers = [];
        if (row.usuario_id !== null) {
          assignedUsers = [{
            id: row.usuario_id,
            nombre: row.usuario_nombre,
            apellido_paterno: row.usuario_apellido_paterno,
            apellido_materno: row.usuario_apellido_materno,
            url_foto: row.usuario_url_foto
          }];
        }
        return {
          id: `role-${row.puesto_id}`,                  // ej. "role-2"
          name: row.puesto_nombre,
          description: row.puesto_responsabilidad,
          assignedUsers                                  // [] o [ { id, nombre, apellidos, url_foto } ]
        };
      });
      setRoles(fetched);
    })
    .catch(err => {
      console.error('Error al traer puestos:', err);
      showAlert('error', 'No se pudieron cargar los puestos.');
    });
}, []);


  // --------------------------------------
  // Drag & Drop: al terminar de arrastrar
  // Si soltamos sobre un puesto, asignar ese user_id al puesto correspondiente
  // --------------------------------------
  const handleDragStart = ({ active }) => {
    setActiveDragGroup([active.id]);
  };

  const handleDragEnd = async ({ active, over }) => {
    if (!over || !over.id.startsWith("role-")) return;
    const puestoIdStr = over.id.replace('role-', ''); // numérico
    const draggedUserId = active.id.replace('user-', '');

    // Verificar si en memoria ya existe un assignedUser
    const targetRole = roles.find(r => r.id === over.id);
    if (targetRole.assignedUsers.length >= 1) {
      showAlert('error', 'Este puesto ya tiene asignado un usuario.');
      return;
    }

    // Encontrar el objeto user en la lista de sin asignar
    const draggedUserObj = unassignedUsers.find(u => u.id.toString() === draggedUserId);
    if (!draggedUserObj) return;

    // Llamada PUT para asignar: /api/puestos/:id → { usuario_id: draggedUserId }
    try {
      await axios.put(`${API_URL}/api/puestos/${puestoIdStr}`, {
        usuario_id: parseInt(draggedUserId, 10)
      });
      // Si sale bien:
      setUnassignedUsers(us => us.filter(u => u.id.toString() !== draggedUserId));
      setRoles(rs =>
        rs.map(r =>
          r.id === over.id
            ? { ...r, assignedUsers: [draggedUserObj] }
            : r
        )
      );
      showAlert('success', 'Usuario asignado correctamente.');
    } catch (err) {
      console.error('Error al asignar usuario al puesto:', err);
      showAlert('error', 'No se pudo asignar usuario en BD.');
    }
  };

  // --------------------------------------
  // Confirmar quitar usuario de un puesto (en modo edición)
  // --------------------------------------
  const handleConfirmRemove = async () => {
    // Quitar al userToRemove de la lista temporal
    const updatedEdit = editAssignedUsers.filter(u => u.id !== userToRemove.id);
    setEditAssignedUsers(updatedEdit);

    // PUT /api/puestos/:id con usuario_id = null
    const realId = editingRoleId.replace('role-', '');
    try {
      await axios.put(`${API_URL}/api/puestos/${realId}`, {
        usuario_id: null
      });
      // Si sale bien, devolvemos ese usuario a "sin asignar"
      setUnassignedUsers(prev => [...prev, userToRemove]);
      // Actualizamos roles en memoria
      setRoles(prev =>
        prev.map(r =>
          r.id === editingRoleId
            ? { ...r, assignedUsers: updatedEdit }
            : r
        )
      );
      showAlert('success', 'Usuario quitado del puesto.');
    } catch (err) {
      console.error('Error al quitar usuario del puesto:', err);
      showAlert('error', 'No se pudo actualizar en BD.');
    }

    setConfirmRemoveOpen(false);
    setUserToRemove(null);
  };

  // --------------------------------------
  // Abrir modal de detalles (solo lectura) de un puesto
  // --------------------------------------
  const openRoleModalReadOnly = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    setSelectedRoleForModal(role);
  };
  const closeRoleModalReadOnly = () => setSelectedRoleForModal(null);

  // --------------------------------------
  // Abrir modal de edición de un puesto
  // --------------------------------------
  const handleEditRole = () => {
    setEditingRoleId(menuRoleId);
    const role = roles.find(r => r.id === menuRoleId);
    if (role) {
      setRoleModalData({ name: role.name, description: role.description });
      setRoleModalMode('edit');
      setRoleModalOpen(true);
      setEditAssignedUsers(role.assignedUsers);
    }
    setAnchorEl(null);
    setMenuRoleId(null);
  };

  // --------------------------------------
  // Abrir modal para agregar nuevo puesto
  // --------------------------------------
  const handleAddRole = () => {
    setRoleModalData({ name: '', description: '' });
    setRoleModalMode('add');
    setRoleModalOpen(true);
  };

  // --------------------------------------
  // Guardar cambios de modal (add o edit)
  // --------------------------------------
  const handleRoleModalSave = async () => {
    if (roleModalMode === 'add') {
      // Crear nuevo puesto con POST
      try {
        const resp = await axios.post(`${API_URL}/api/puestos`, {
          nombre: roleModalData.name,
          responsabilidad: roleModalData.description
        });
        // Añadirlo al estado en memoria:
        const nuevo = {
          id: `role-${resp.data.id}`,
          name: resp.data.nombre,
          description: resp.data.responsabilidad,
          assignedUsers: []
        };
        setRoles(prev => [...prev, nuevo]);
        showAlert("success", "Puesto creado correctamente.");
      } catch (err) {
        console.error('Error al crear puesto:', err);
        showAlert('error', 'No se pudo crear puesto en BD.');
      }
    } else {
      // Editar un puesto existente
      const realId = editingRoleId.replace('role-', '');
      try {
        await axios.put(`${API_URL}/api/puestos/${realId}`, {
          nombre: roleModalData.name,
          responsabilidad: roleModalData.description
        });
        // Reflejamos en memoria:
        setRoles(prev =>
          prev.map(r =>
            r.id === editingRoleId
              ? { ...r, name: roleModalData.name, description: roleModalData.description }
              : r
          )
        );
        showAlert("success", "Puesto actualizado correctamente.");
      } catch (err) {
        console.error('Error al actualizar puesto:', err);
        showAlert('error', 'No se pudo actualizar puesto en BD.');
      }
    }
    setRoleModalOpen(false);
  };

  const handleRoleModalChange = (field, value) => {
    setRoleModalData(prev => ({ ...prev, [field]: value }));
  };

  // --------------------------------------
  // Eliminar un puesto
  // --------------------------------------
  const handleDeleteRole = () => {
    const role = roles.find(r => r.id === menuRoleId);
    if (role) {
      setRoleToDelete(role);
      setDeleteRoleModalOpen(true);
    }
    setAnchorEl(null);
    setMenuRoleId(null);
  };

  const confirmDeleteRole = async () => {
    const realId = roleToDelete.id.replace('role-', '');
    try {
      await axios.delete(`${API_URL}/api/puestos/${realId}`);
      // Devolver a "sin asignar" cualquier usuario asignado
      const usersBack = roleToDelete.assignedUsers;
      setUnassignedUsers(prev => [...prev, ...usersBack]);
      setRoles(prev => prev.filter(r => r.id !== roleToDelete.id));
      showAlert("success", "Puesto eliminado correctamente.");
    } catch (err) {
      console.error('Error al eliminar puesto:', err);
      showAlert('error', 'No se pudo eliminar puesto en BD.');
    }
    setDeleteRoleModalOpen(false);
    setRoleToDelete(null);
  };

  const cancelDeleteRole = () => setDeleteRoleModalOpen(false);

  // --------------------------------------
  // Menú de opciones del puesto (Editar / Eliminar)
  // --------------------------------------
  const handleOpenMenu = (event, roleId) => {
    setAnchorEl(event.currentTarget);
    setMenuRoleId(roleId);
  };
  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuRoleId(null);
  };

  // --------------------------------------
  // Filtrado local de usuarios sin asignar
  // --------------------------------------
  const filteredUnassigned = unassignedUsers.filter(u => {
    const fullName = `${u.nombre} ${u.apellido_paterno} ${u.apellido_materno}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  // --------------------------------------
  // Renderización
  // --------------------------------------
  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" align="center" gutterBottom sx={{ fontSize: '1.5rem' }}>
          Gestión de Puestos del Sindicato
        </Typography>
        <Typography variant="subtitle1" align="center" gutterBottom sx={{ fontSize: '0.9rem' }}>
          Arrastra un usuario a un puesto para asignarlo.
        </Typography>

        {/* Botón para agregar un nuevo puesto */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Button variant="contained" onClick={handleAddRole}>
            Agregar Puesto
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {/* Columna de Usuarios sin Asignar */}
          <Paper sx={{ flex: 1, p: 2 }}>
            <Typography variant="h6" align="center" gutterBottom sx={{ fontSize: '1rem' }}>
              Usuarios sin Asignar
            </Typography>

            {/* Barra de búsqueda */}
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder="Buscar por nombre"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Lista de usuarios sin asignar (dinámica) */}
            <Box
  sx={{
    minHeight: 300,
    maxHeight: 400,    // 🔥 altura máxima con scroll
    overflowY: "auto", // 🔥 activa scrollbar vertical
    p: 2,
    border: '1px dashed #ccc',
    borderRadius: '6px'
  }}
>
  {filteredUnassigned.map(user => (
    <DraggableUser key={user.id} user={user} />
  ))}
</Box>
          </Paper>

          {/* Columna de Puestos (dinámicos) */}
          <Paper sx={{ flex: 2, p: 2 }}>
            <Typography variant="h6" align="center" gutterBottom sx={{ fontSize: '1rem' }}>
              Lista de Puestos
            </Typography>
            <Box
  sx={{
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    maxHeight: 500,      // 🔥 define altura máxima
    overflowY: "auto",   // 🔥 permite scroll
    pr: 1                // evita que el scrollbar tape contenido
  }}
>
  {roles.map(role => (
    <Paper key={role.id} sx={{ p: 1 }} variant="outlined">

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Tooltip title="Más información" arrow>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '0.95rem',
                          "&:hover": { color: 'green' }
                        }}
                        onClick={() => openRoleModalReadOnly(role.id)}
                      >
                        {role.name}
                      </Typography>
                    </Tooltip>
                    <IconButton size="small" onClick={(e) => handleOpenMenu(e, role.id)}>
                      <MoreVertIcon />
                    </IconButton>
                  </Box>

                  {/* Área droppable */}
                  <DroppableRole role={role}>
                    {role.assignedUsers.map(user => {
                      const fullName = `${user.nombre} ${user.apellido_paterno} ${user.apellido_materno}`;
                      return (
                        <Box key={user.id} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                          <Avatar
                            sx={{ mr: 1, width: 28, height: 28 }}
                            src={user.url_foto || undefined}
                          >
                            {!user.url_foto && getInitials(fullName)}
                          </Avatar>
                          <Typography sx={{ fontSize: '0.9rem' }}>{fullName}</Typography>
                        </Box>
                      );
                    })}
                  </DroppableRole>
                </Paper>
              ))}
            </Box>
          </Paper>
        </Box>

        {/* -------------------------------------------------- */}
        {/* Modal de detalles del puesto (solo lectura)        */}
        {/* -------------------------------------------------- */}
        {selectedRoleForModal && (
          <Dialog
            open={Boolean(selectedRoleForModal)}
            TransitionComponent={Transition}
            onClose={closeRoleModalReadOnly}
            fullWidth
            maxWidth="sm"
          >
            <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
              <IconButton onClick={closeRoleModalReadOnly}>
                <CloseIcon />
              </IconButton>
            </Box>
            <DialogTitle sx={{ fontSize: '1.1rem' }}>
              {selectedRoleForModal.name}
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ fontSize: '0.9rem' }}>
                <strong>Nombre del puesto:</strong> {selectedRoleForModal.name}<br />
                <strong>Responsabilidad:</strong> {selectedRoleForModal.description}<br />
                <strong>Usuario asignado:</strong>{" "}
                {selectedRoleForModal.assignedUsers.length > 0
                  ? `${selectedRoleForModal.assignedUsers[0].nombre} ${selectedRoleForModal.assignedUsers[0].apellido_paterno}`
                  : "Ninguno"}
              </DialogContentText>
            </DialogContent>
          </Dialog>
        )}

        {/* -------------------------------------------------- */}
        {/* Modal para Agregar / Editar puesto                  */}
        {/* -------------------------------------------------- */}
        <Dialog
          open={roleModalOpen}
          TransitionComponent={Transition}
          onClose={() => setRoleModalOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle sx={{ fontSize: '1.1rem' }}>
            {roleModalMode === 'add' ? "Agregar Puesto" : "Editar Puesto"}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ "& > .MuiGrid-item": { pt: "21px" } }}>
              <Grid item xs={12}>
                <TextField
                  label="Nombre del Puesto"
                  size="small"
                  fullWidth
                  value={roleModalData.name || ""}
                  onChange={(e) => handleRoleModalChange('name', e.target.value)}
                  inputProps={{ style: { fontSize: '0.875rem' } }}
                  InputLabelProps={{ style: { fontSize: '0.875rem' } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Responsabilidad"
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  value={roleModalData.description || ""}
                  onChange={(e) => handleRoleModalChange('description', e.target.value)}
                  inputProps={{ style: { fontSize: '0.875rem' } }}
                  InputLabelProps={{ style: { fontSize: '0.875rem' } }}
                />
              </Grid>
            </Grid>

            {roleModalMode === 'edit' && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, fontSize: '0.95rem' }}>
                  Usuario asignado (editar):
                </Typography>
                {editAssignedUsers.length === 0
                  ? <Typography sx={{ fontSize: '0.9rem' }}>No hay usuarios asignados.</Typography>
                  : editAssignedUsers.map(user => {
                      const fullName = `${user.nombre} ${user.apellido_paterno} ${user.apellido_materno}`;
                      return (
                        <Box
                          key={user.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1,
                            p: 1,
                            bgcolor: '#f5f5f5',
                            borderRadius: 1
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar
                              sx={{ mr: 1, width: 28, height: 28 }}
                              src={user.url_foto || undefined}
                            >
                              {!user.url_foto && getInitials(fullName)}
                            </Avatar>
                            <Typography sx={{ fontSize: '0.9rem' }}>{fullName}</Typography>
                          </Box>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setUserToRemove(user);
                              setConfirmRemoveOpen(true);
                            }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      );
                    })
                }
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center', gap: 2 }}>
            <Button variant="contained" color="warning" onClick={() => setRoleModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={handleRoleModalSave}>
              Guardar
            </Button>
          </DialogActions>
        </Dialog>

        {/* -------------------------------------------------- */}
        {/* Diálogo de confirmación para quitar usuario        */}
        {/* -------------------------------------------------- */}
        <Dialog
          open={confirmRemoveOpen}
          onClose={() => setConfirmRemoveOpen(false)}
          maxWidth="xs"
        >
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>
            <DialogContentText>
              ¿Estás seguro de que quieres quitar a <strong>
                {userToRemove 
                  ? `${userToRemove.nombre} ${userToRemove.apellido_paterno}`
                  : ''
                }
              </strong> de este puesto?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmRemoveOpen(false)}>Cancelar</Button>
            <Button color="error" onClick={handleConfirmRemove}>Eliminar</Button>
          </DialogActions>
        </Dialog>

        {/* -------------------------------------------------- */}
        {/* Modal de confirmación para eliminar puesto          */}
        {/* -------------------------------------------------- */}
        <Dialog
          open={deleteRoleModalOpen}
          TransitionComponent={Transition}
          onClose={cancelDeleteRole}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle sx={{ fontSize: '1.1rem' }}>Confirmar Eliminación</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ fontSize: '0.9rem' }}>
              ¿Está seguro de que desea eliminar el puesto "<strong>{roleToDelete?.name}</strong>"? 
              El usuario asignado (si lo hay) volverá a la lista de sin asignar.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center' }}>
            <Button onClick={cancelDeleteRole}>Cancelar</Button>
            <Button onClick={confirmDeleteRole} color="error">
              Confirmar
            </Button>
          </DialogActions>
        </Dialog>

        {/* -------------------------------------------------- */}
        {/* Menú de opciones del puesto (Editar / Eliminar)      */}
        {/* -------------------------------------------------- */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseMenu}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={handleEditRole}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} /> Editar
          </MenuItem>
          <MenuItem onClick={handleDeleteRole}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Eliminar
          </MenuItem>
        </Menu>

        {/* -------------------------------------------------- */}
        {/* Snackbar para feedback de acciones                  */}
        {/* -------------------------------------------------- */}
        <Snackbar
          open={alert.open}
          autoHideDuration={3000}
          onClose={handleAlertClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{ mt: 7 }}
        >
          <Alert onClose={handleAlertClose} severity={alert.severity} sx={{ width: '100%' }}>
            {alert.message}
          </Alert>
        </Snackbar>
      </Box>
    </DndContext>
  );
}