Deuxième projet de Maxime Hohl
==============================

Génération procédural de Terrain
--------------------------------
Le projet est basé sur la bibliothèque easywgl. Le fichier du projet se nomme `projet.js`.

### Paramètres
La plupart des paramètres sont présent dans l'interface du navigateur, mais les paramètres 
des couches (eau, sable, herbe, etc.) sont au début du fichier JavaScript car il y a trop
de paramètres.  

### TODO
- Utiliser les normals
    - Pour appliquer un modèle de Phong (ou PBR)
    - Pour projeter les textures de manière parallèle  à la surface et non pas parallèle à la mer
- Génération plus poussée
    - Ajouter un offset random pour chaque octave
    - Simuler l'érosion
