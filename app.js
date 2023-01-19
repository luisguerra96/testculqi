const express = require('express');
const mongoose = require('mongoose');
const app = express();
const jwt = require('jsonwebtoken');
const keys = require('./settings/keys');

// Settings //
app.set('key', keys.key);
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.set('port', process.env.PORT || 3000);
mongoose.set("strictQuery", false);

// Conexión a MongoDB //
mongoose.connect('mongodb://localhost:27017/culqi', {
    useUnifiedTopology: true,
    useNewUrlParser: true
})
    .then(db => console.log('Database is connected'))
    .catch(err => console.log(err));

// Esquema y Validación de los datos de la Tarjeta //
const tarjetaSchema = new mongoose.Schema (
    { 
        cvv: {
            type: Number,
            required: true,
            enum: ['123', '4532'],
        },
        expiration_month: {
            type: String,
            required: true,
            minLength: 1,
            maxLength: 12,
        },
        expiration_year: {
            type: String,
            required: true,
            minLength: 1,
            maxLength: 4,
        },
        card_number: {
            type: String,            
            required: true,
            minLength: 13,
            maxLength: 16
        },
        email: {
            type: String,
            required: true,
            minLength: 5,
            maxLength: 100
        },
        token: {
            type: String,
            required: false
        }
    }
);

const Tarjeta = mongoose.model('tarjetas', tarjetaSchema);

// Uso de la autorización para el TOKEN //
const verificacion = express.Router();
verificacion.use((req, res, next) => {
    let token = req.headers['x-access-token'] || req.headers['authorization'];
    if(!token) {
        res.status(401).send({
            error: 'Es necesario un token de autenticación'
        })
        return;
    }
    if(token.startsWith('Bearer ')){
        token = token.slice(7, token.length);
        console.log(token);
    }
    if(token) {
        jwt.verify(token, app.get('key'), (error, decoded) => {
            if(error) {
                return res.json({
                    mensaje: 'El token no es válido'
                });
            } else {
                req.decoded = decoded;
                next();
            }
        })
    }
});

// Obtener todas las Tarjetas //
app.get('/', verificacion, (req, res) => {
    Tarjeta.find()
        .then(tarjeta => res.json(tarjeta))
        .catch(error => res.json(error))
})

// Registro de datos de tarjeta y Token //
app.post('/', async (req, res) => {
    try {
        const body = req.body;   
        const tarjeta = new Tarjeta(body);
        // Creación del  Token //
        const payload = {
            check: true
        };
        const token = jwt.sign(payload, app.get('key'), {
            expiresIn: '1d'
        })
        console.log('TOKEN =>', token);
        tarjeta.token = token;
        const result = await tarjeta.save();
        console.log('result', result);
        if(result) {
            res.json({
                mensaje: 'Registro de los datos de la Tarjeta OK',
                tarjeta
            });
        }
    } catch (error) {
        res.json({
            mensaje: 'Error en el Registro',
            error
        });
    }
})

// Verificación //
app.get('/info', verificacion, (req, res) => {
    res.json('Validación de Token');
})

// Obtener tarjeta por Token //
app.get('/tarjeta/:token', verificacion, (req, res) => {
    const token = req.params.token;

    jwt.verify(token, app.get('key'), (error, decoded) => {
        if(error) {
            return res.json({
                mensaje: 'El token no es válido'
            });
        } else {
            req.decoded = decoded;
            jwt.verify(token, app.get('key'), (error, decoded) => {
                if(error) {
                    return res.json({
                        mensaje: 'El token no es válido'
                    });
                } else {
                    req.decoded = decoded;
                    console.log('decoded', decoded);
                    console.log('tokencito', token);
                    Tarjeta.find({ token: token})
                        .then(tarjeta => res.json(tarjeta))
                        .catch(error => res.json(error))
                }
            })
        }
    })
})

// Servidor Corriendo //
app.listen(app.get('port'), () => {
    console.log('Server on port:', app.get('port'));
});

