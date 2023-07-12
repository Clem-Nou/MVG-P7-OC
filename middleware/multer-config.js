/* eslint-disable object-shorthand */
/* eslint-disable prefer-template */
const multer = require('multer');

// Définition des types MIME autorisés et de leurs extensions correspondantes
const MIME_TYPES = {
  'image/jpg': 'jpg',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Configuration du stockage des fichiers avec multer
const storage = multer.diskStorage({
  // Destination du fichier
  destination: (req, file, callback) => {
    callback(null, 'images');
  },
  // Nom du fichier
  filename: (req, file, callback) => {
    const name = file.originalname.split(' ').join('_');
    const nameWithoutExtension = name.split('.')[0];
    const extension = MIME_TYPES[file.mimetype];
    callback(null, nameWithoutExtension + Date.now() + '.' + extension);
  },
});

// Fonction de validation du type de fichier
const fileFilter = (req, file, callback) => {
  // Vérifier si le type MIME est autorisé
  if (MIME_TYPES[file.mimetype]) {
    callback(null, true);
  } else {
    // Rejeter le fichier avec une erreur
    callback(new Error('Type de fichier non autorisé'));
  }
};

module.exports = multer({ storage: storage, fileFilter: fileFilter }).single(
  'image',
);
