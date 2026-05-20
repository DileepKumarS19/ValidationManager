const response = await fetch('http://localhost:5000/auth/login', { redirect: 'manual' });
console.log('Status Code:', response.status);
console.log('Location:', response.headers.get('location'));
