/* eslint-disable no-param-reassign */
/* eslint-disable no-shadow */
/* eslint-disable consistent-return */
/* eslint-disable function-paren-newline */
/* eslint-disable implicit-arrow-linebreak */
/* eslint-disable eqeqeq */
/* eslint-disable no-unused-vars */
/* eslint-disable no-lonely-if */
/* eslint-disable no-underscore-dangle */
/* eslint-disable arrow-parens */

const fs = require('fs');
const sharp = require('sharp');
sharp.cache(false);
const Book = require('../models/Book');

exports.createBook = (req, res, next) => {
  const bookObject = JSON.parse(req.body.book);
  const resizedImagePath = `images/resized_${
    req.file.filename.split('.')[0]
  }.webp`;

  sharp(req.file.path)
    .resize(340, 475, { fit: 'cover' })
    .toFormat('webp') // Convertir en format WebP
    .toFile(resizedImagePath)
    .then(() => {
      fs.unlinkSync(req.file.path);
      const book = new Book({
        ...bookObject,
        userId: req.auth.userId,
        imageUrl: `${req.protocol}://${req.get('host')}/${resizedImagePath}`,
      });

      book
        .save()
        .then(() => {
          res.status(201).json({ message: 'Objet enregistré !' });
        })
        .catch(error => {
          fs.unlinkSync(resizedImagePath);
          res.status(400).json({ error });
        });
    })
    .catch(error => {
      fs.unlinkSync(resizedImagePath);
      fs.unlinkSync(req.file.path);
      res.status(400).json({ error });
    });
};

exports.getAllBooks = (req, res, next) => {
  Book.find()
    .then(books => res.status(200).json(books))
    .catch(error => res.status(400).json({ error }));
};

exports.getOneBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then(book => res.status(200).json(book))
    .catch(error => res.status(404).json({ error }));
};

exports.bestRatings = (req, res, next) => {
  Book.find()
    .sort({ averageRating: -1 })
    .limit(3)
    .then(books => {
      res.status(200).json(books);
    })
    .catch(error => {
      res.status(500).json({ error });
    });
};

exports.modifyBook = (req, res, next) => {
  const bookObject = req.file
    ? {
        ...JSON.parse(req.body.book),
        imageUrl: `${req.protocol}://${req.get('host')}/images/${
          req.file.filename
        }.webp`, // Utiliser le format WebP pour la nouvelle image
      }
    : { ...req.body };

  delete bookObject._userId;
  Book.findOne({ _id: req.params.id })
    .then(book => {
      if (book.userId != req.auth.userId) {
        res.status(403).json({ message: 'unauthorized request' });
      } else {
        // Vérifier si une nouvelle image est téléchargée
        if (req.file) {
          // Supprimer l'ancienne image
          const filename = book.imageUrl.split('/images/')[1];
          fs.unlink(`images/${filename}`, () => {
            // Redimensionner et enregistrer la nouvelle image avec sharp
            const resizedImagePath = `images/resized_${
              req.file.filename.split('.')[0]
            }.webp`;
            sharp(req.file.path)
              .resize(340, 475)
              .toFormat('webp') // Convertir en format WebP
              .toFile(resizedImagePath)
              .then(() => {
                fs.unlinkSync(req.file.path);
                // Mettre à jour les informations du livre avec la nouvelle image
                bookObject.imageUrl = `${req.protocol}://${req.get(
                  'host',
                )}/${resizedImagePath}`;
                Book.updateOne(
                  { _id: req.params.id },
                  { ...bookObject, _id: req.params.id },
                )
                  .then(() =>
                    res.status(200).json({ message: 'Objet modifié!' }),
                  )
                  .catch(error => res.status(401).json({ error }));
              })
              .catch(error => {
                fs.unlinkSync(resizedImagePath);
                fs.unlinkSync(req.file.path);
                res.status(400).json({ error });
              });
          });
        } else {
          // Pas de nouvelle image, mettre à jour les informations du livre sans modifier l'image
          Book.updateOne(
            { _id: req.params.id },
            { ...bookObject, _id: req.params.id },
          )
            .then(() => res.status(200).json({ message: 'Objet modifié!' }))
            .catch(error => res.status(401).json({ error }));
        }
      }
    })
    .catch(error => res.status(400).json({ error }));
};

exports.deleteBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then(book => {
      if (book.userId != req.auth.userId) {
        res.status(401).json({ message: 'Non-autorisé' });
      } else {
        const filename = book.imageUrl.split('/images/')[1];
        fs.unlink(`images/${filename}`, () => {
          Book.deleteOne({ _id: req.params.id })
            .then(() => {
              res.status(200).json({ message: 'Objet supprimé !' });
            })
            .catch(error => res.status(401).json({ error }));
        });
      }
    })
    .catch(error => {
      res.status(500).json({ error });
    });
};

exports.ratingBook = (req, res, next) => {
  const { id } = req.params;
  const { rating } = req.body;

  Book.findById(id)
    .then(book => {
      if (!book) {
        return res.status(404).json({ message: 'Livre non trouvé' });
      }

      // Vérifie si l'utilisateur a déjà voté pour ce livre
      const hasVoted = book.ratings.some(
        rating => rating.userId === req.auth.userId,
      );
      if (hasVoted) {
        return res
          .status(400)
          .json({ message: 'Vous avez déjà voté pour ce livre' });
      }

      // Ajoute la notation au tableau "ratings" dans le schéma du livre concerné
      book.ratings.push({ userId: req.auth.userId, grade: rating });

      // Calcul du nouvel Rating en arrondissant la somme au nombre d'étoiles
      const totalRatings = book.ratings.length + 1;
      const sumRatings = book.ratings.reduce(
        (sum, rating) => sum + rating.grade,
        0,
      );
      const newRating = rating;
      const newAverageRating = Math.round(
        (sumRatings + newRating) / totalRatings,
      );
      book.averageRating = newAverageRating;

      book
        .save()
        .then(() => res.status(201).json(book))
        .catch(error => res.status(400).json({ error }));
    })
    .catch(error => res.status(500).json({ error }));
};
