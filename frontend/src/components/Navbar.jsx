import React from 'react';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AppNavbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!user) return null;

  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/dashboard">
          <i className="bi bi-wallet2 me-2"></i>
          Financial Manager
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-navbar" />
        <Navbar.Collapse id="main-navbar">
          <Nav className="me-auto">
            <Nav.Link
              as={Link}
              to="/dashboard"
              active={location.pathname === '/dashboard'}
            >
              <i className="bi bi-speedometer2 me-1"></i> Dashboard
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/transactions"
              active={location.pathname === '/transactions'}
            >
              <i className="bi bi-arrow-left-right me-1"></i> Transacciones
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/accounts"
              active={location.pathname === '/accounts'}
            >
              <i className="bi bi-bank me-1"></i> Cuentas
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/categories"
              active={location.pathname === '/categories'}
            >
              <i className="bi bi-tags me-1"></i> Categorías
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/budgets"
              active={location.pathname === '/budgets'}
            >
              <i className="bi bi-pie-chart me-1"></i> Presupuestos
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/reports"
              active={location.pathname === '/reports'}
            >
              <i className="bi bi-graph-up me-1"></i> Reportes
            </Nav.Link>
          </Nav>
          <Nav>
            <NavDropdown title={user.email || 'Usuario'} id="user-dropdown">
              <NavDropdown.Item onClick={handleLogout}>
                <i className="bi bi-box-arrow-right me-2"></i>
                Cerrar Sesión
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
