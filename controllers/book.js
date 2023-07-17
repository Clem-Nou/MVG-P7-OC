/* eslint-disable import/newline-after-import */
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
  // Récupération des informations du livre depuis le corps de la requête

  // Chemin de l'image redimensionnée
  const resizedImagePath = `images/resized_${
    req.file.filename.split('.')[0]
  }.webp`;

  sharp(req.file.path)
    .resize(340, 475, { fit: 'cover' }) // Redimensionnement de l'image
    .toFormat('webp') // Conversion de l'image en format WebP
    .toFile(resizedImagePath) // Stockage de l'image redimensionnée
    .then(() => {
      fs.unlinkSync(req.file.path); // Suppression de l'image d'origine

      // Création d'une instance du modèle Book avec les informations du livre et l'URL de l'image
      const book = new Book({
        ...bookObject,
        userId: req.auth.userId, // ID de l'utilisateur extrait du jeton d'authentification
        imageUrl: `${req.protocol}://${req.get('host')}/${resizedImagePath}`,
      });

      book
        .save() // Enregistrement du livre dans la base de données
        .then(() => {
          res.status(201).json({ message: 'Objet enregistré !' }); // Réponse avec statut 201 en cas de succès
        })
        .catch(error => {
          fs.unlinkSync(resizedImagePath); // Suppression de l'image redimensionnée en cas d'erreur
          res.status(400).json({ error }); // Réponse avec statut 400 en cas d'erreur
        });
    })
    .catch(error => {
      fs.unlinkSync(resizedImagePath); // Suppression de l'image redimensionnée
      fs.unlinkSync(req.file.path); // Suppression de l'image d'origine
      res.status(400).json({ error }); // Réponse avec statut 400 en cas d'erreur
    });
};

exports.getAllBooks = (req, res, next) => {
  Book.find() // Recherche de tous les livres dans la base de données
    .then(books => res.status(200).json(books))
    // Renvoi des livres trouvés avec un statut 200 en cas de succès
    .catch(error => res.status(400).json({ error }));
  // Renvoi d'une erreur avec un statut 400 en cas d'erreur
};

exports.getOneBook = (req, res, next) => {
  // Recherche d'un livre dans la base de données en utilisant son identifiant (_id)
  Book.findOne({ _id: req.params.id })
    .then(book => {
      // Si le livre est trouvé, le renvoyer en tant que réponse JSON avec un statut HTTP 200
      res.status(200).json(book);
    })
    .catch(error => {
      // Si le livre n'est pas trouvé, renvoyer une réponse JSON avec un statut HTTP 404
      res.status(404).json({ error });
    });
};

exports.bestRatings = (req, res, next) => {
  // Recherche des livres dans la base de données
  Book.find()
    // Trier les livres en fonction de la note moyenne (averageRating) en ordre décroissant (-1)
    .sort({ averageRating: -1 })
    // Limiter les résultats aux 3 premiers livres (les meilleurs notes)
    .limit(3)
    .then(books => {
      // Envoi des livres avec les meilleures notes en tant que réponse JSON avec un statut HTTP 200
      res.status(200).json(books);
    })
    .catch(error => {
      // En cas d'erreur, renvoyer une réponse JSON avec un statut HTTP 500
      res.status(500).json({ error });
    });
};

exports.modifyBook = (req, res, next) => {
  // Vérifier si une nouvelle image est téléchargée
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
        // Vérifier si l'utilisateur est autorisé à modifier le livre
        res.status(403).json({ message: 'unauthorized request' });
      } else {
        if (req.file) {
          // Supprimer l'ancienne image
          const filename = book.imageUrl.split('/images/')[1];
          fs.unlink(`images/${filename}`, () => {
            // Redimensionner et enregistrer la nouvelle image avec Sharp
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
        // Vérifier si l'utilisateur est autorisé à supprimer le livre
        res.status(401).json({ message: 'Non-autorisé' });
      } else {
        const filename = book.imageUrl.split('/images/')[1];
        fs.unlink(`images/${filename}`, () => {
          // Supprimer l'ancienne image du livre
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
        // Vérifier si le livre existe
        return res.status(404).json({ message: 'Livre non trouvé' });
      }

      const hasVoted = book.ratings.some(
        rating => rating.userId === req.auth.userId,
      );
      if (hasVoted) {
        // Vérifier si l'utilisateur a déjà voté pour ce livre
        return res
          .status(400)
          .json({ message: 'Vous avez déjà voté pour ce livre' });
      }

      // Ajouter la nouvelle notation au tableau "ratings" dans le schéma du livre
      book.ratings.push({ userId: req.auth.userId, grade: rating });

      // Calculer la nouvelle note moyenne en arrondissant la somme  au nombre d'évaluations
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
