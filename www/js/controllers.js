var log = function(object, path) {
    angular.forEach(object, function(value, key) {
        if(angular.isObject(value)) {
            log(value, path + '.' + key);
        } else {
            console.log(path + '.' + key, ':', value);
        }
    });
};


angular.module('starter.controllers', [])

    .controller('LoginCtrl', function($scope, DB, $firebaseAuth, $ionicModal, $state, $ionicLoading, $cordovaFacebook, $location) {
        var auth = $firebaseAuth(DB.main);

        $ionicModal.fromTemplateUrl('templates/signup.html', {
            scope: $scope
        }).then(function(modal) {
            $scope.modal = modal;
        });

        var afterLogin = function(authData) {
            DB.users.child(authData.uid + '/config/email').set(authData.facebook.email);
            DB.users.child(authData.uid + '/auth').update(authData);

            $ionicLoading.hide();
            $location.path('/tab/products');
        };

        $scope.signInFacebook = function() {

            var isWebView = ionic.Platform.isWebView();

            $ionicLoading.show({
                template: 'Identification en cours...'
            });

            if(isWebView) {
                $cordovaFacebook.login([
                    'public_profile',
                    'email'
                ]).then(function(success) {
                    console.log('accessToken', success.authResponse.accessToken);

                    auth.$authWithOAuthToken('facebook', success.authResponse.accessToken).then(function(authData) {

                        console.log('Logged in as:', authData.uid);
                        afterLogin(authData);

                    }).catch(function(error) {

                        console.log('Firebase Authentication failed:', error);
                        alert('L\'identification a échouée');
                        $ionicLoading.hide();

                    });

                }, function(error) {
                    console.log('Firebase Authentication failed:', error);
                    alert('L\'identification a échouée');
                    $ionicLoading.hide();
                });
            } else {

                auth.$authWithOAuthPopup('facebook', {
                    scope: 'public_profile,email'
                }).then(function(authData) {

                    console.log('Logged in as:', authData.uid);
                    afterLogin(authData);

                }).catch(function(error) {

                    console.log('Firebase Authentication failed:', error);
                    alert('L\'identification a échouée');

                    $ionicLoading.hide();

                });

            }

        };


    })

    .controller('AccountCtrl', function($scope, DB, $rootScope) {

        var submit = 'Sauvegarder';
        var progress = 'Sauvegarde en cours...';

        $scope.submitText = submit;
        $scope.save = function(user) {
            $scope.saving = true;
            $scope.submitText = progress;

            DB.users.child($rootScope.currentUser.auth.uid).update({
                config: {
                    email: user.config.email,
                    phone: user.config.phone
                }
            }, function(err) {
                if(err) {
                    alert('Sauvegarde échouée');
                } else {
                    $scope.$apply(function() {
                        $scope.submitText = submit;
                        $scope.saving = false;
                    });
                }
            });
        };

    })

    .controller('ProductsCtrl', function($scope, Location, Products, $ionicActionSheet, $rootScope, Backend, $ionicPopup) {
        $scope.Location = Location;

        $scope.shouldShowReorder = true;

        var current;
        var products = [];
        $scope.update = function(location) {
            if(current !== location && location.latitude) {
                current = location;
                products = Products.getByLocation(location);
            }
            return products;
        };


        $scope.show = function(product) {

            var buttons = [];

            var phone = 'Téléphone';
            var sms = 'SMS';
            var email = 'Email';
            var maps = 'Ouvrir dans Plans';
            var remove = 'Supprimer';

            if(product.object.phone) {
                buttons.push({
                    text: phone
                });

                buttons.push({
                    text: sms
                });
            }

            if(product.object.email) {
                buttons.push({
                    text: email
                });

            }

            buttons.push({
                text: maps
            });

            if(product.object.user === $rootScope.currentUser.auth.uid) {
                buttons.push({
                    text: remove
                });
            }

            // Show the action sheet
            var hideSheet = $ionicActionSheet.show({
                buttons      : buttons,
                //destructiveText: 'Delete',
                titleText    : 'Contacter l\'annonceur',
                cancelText   : '<strong>Annuler</strong>',
                cancel       : function() {
                    // add cancel code..
                },
                buttonClicked: function(index, item) {

                    switch (item.text) {
                        case phone:
                            document.location.href = 'tel:' + product.object.phone;
                            break;

                        case sms:
                            document.location.href = 'sms:' + product.object.phone;
                            break;

                        case email:
                            document.location.href = 'mailto:' + product.object.email;
                            break;

                        case maps:
                            document.location.href = 'maps:q=' + product.location[0] + ',' + product.location[1];
                            break;

                        case remove:

                            navigator.notification.confirm('Êtes-vous sûr(e) de vouloir supprimer cette annonce ?', function(buttonIndex) {
                                if(buttonIndex === 2) {
                                    Backend.removeProduct(product);
                                }
                            }, 'Confirmez', ['Annuler', 'Supprimer']);

                            break;
                    }
                    return true;
                }
            });

        };
    })

    .controller('ProductCtrl', function($scope, $stateParams, Products) {
        $scope.product = Products.getById($stateParams.productId);
    })

    .controller('PhotoCtrl', function($scope, Camera, Backend, $state, $location, $jrCrop, $q, $window, $cordovaFile) {

        var goHome = function() {
            //$state.go('tab.products');
            $location.path('/tab/products');
        };

        $scope.$on('$ionicView.enter', function() {
            if(!$scope.isUploading) {
                //$scope.takePhoto();
            }
        });


        /*var savefile = function(target, dataUrl, cb) {

         var name = target.substr(target.lastIndexOf('/') + 1).replace('.jpg', '') + '-TEST.jpg';
         var targetPath = cordova.file.tempDirectory + name;

         console.log('name', name);
         console.log('cordova.file.tempDirectory', cordova.file.tempDirectory);
         //console.log('dataUrl', dataUrl);

         $cordovaFile.writeFile(cordova.file.tempDirectory, name, dataUrl, true).then(function(success) {

         $timeout(function() {
         log(success, 'success');

         alert('WRITE FILE OK');
         cb(null, targetPath);
         }, 3000);

         }, function() {

         alert('CHECK ERROR');

         });
         };*/

        /*var cropPicture = function(imagePath) {

         $jrCrop.crop({
         url   : imagePath,
         width : 320,
         height: 320
         }).then(function(canvas) {
         //var image = canvas.toDataURL('image/jpeg', 1);
         var image = canvas.toDataURL();

         savefile(imagePath, image, function(err, path) {
         if(err) {
         alert('La prise de photo a échouée');
         } else {
         $scope.currentPhoto = path;
         dealWithPicture(path);
         }
         });

         }, function() {
         alert('La prise de photo a échouée');
         });
         };*/

        var dealWithPicture = function(picture) {

            $scope.image = picture;
            $scope.isUploading = true;

            Backend.uploadPicture(picture).then(function(path) {

                Backend.saveToFirebase(path).then(function() {
                    console.log('Saved to Firebase');
                }, function() {
                    alert('L\'envoi a échoué');
                }).finally(function() {
                    $scope.isUploading = false;
                    goHome();
                });

            }, function() {
                alert('L\'envoi a échoué');
                $scope.isUploading = false;
                goHome();
            });

        };

        $scope.choosePhoto = function() {
            Camera.choosePicture().then(dealWithPicture);
            //Camera.choosePicture().then(cropPicture);
        };

        $scope.takePhoto = function() {
            Camera.takePicture().then(dealWithPicture);
            //Camera.takePicture().then(cropPicture);
        };

    });
