// Gruntfile
module.exports = function(grunt) {

    // Force use of Unix newlines
    grunt.util.linefeed = '\n';

    // Initializing the configuration object
    grunt.initConfig({

        // Task configuration
        // Concatinate JS files into one app.js file
        concat: {
            options: {
                separator: ';',
            },
            development: {
                src: [
                './bower_components/jquery/dist/jquery.js',
                './bower_components/bootstrap/dist/js/bootstrap.js',
                './bower_components/bootstrap-3-datepicker/dist/js/bootstrap-datepicker.min.js',
                //'./bower_components/bootstrap3-typeahead/bootstrap3-typeahead.js',
                './assets/js/*.js'
                ],
                dest: './js/app.js',
            }
        },

        // Compile less into one style.css styesheet
        less: {
            development: {
                options: {
                    compress: true,
                },
                files: {
                    "./css/style.css": "./assets/less/base.less"
                }
            }
        },

        // Compress the app.js into app.min.js
        uglify: {
            options: {
                sourceMap: './js/app.min.js.map',
                mangle: true,
                compress: {},
                beautify: false
            },
            development: {
                files: {
                    './js/app.min.js': './js/app.js',
                }
            }
        },

        // Watch JS and LESS files to compile on save
        watch: {
            js: {
                files: [
                './bower_components/jquery/dist/jquery.js',
                './bower_components/bootstrap/dist/js/bootstrap.js',
                './assets/js/*.js'
                ],
                tasks: ['concat', 'uglify'],
                options: {
                    livereload: true
                }
            },
            less: {
                files: ['./assets/less/*.less'],
                tasks: ['less'],
                options: {
                    livereload: true
                }
            },
        }
    });

    // Plugin Loading
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    // Task definition
    grunt.registerTask('default', ['concat','uglify','less', 'watch']);

    grunt.registerTask('build', ['concat','uglify','less']);
}; 
