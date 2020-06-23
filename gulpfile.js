/* eslint-disable */
const autoprefixer = require("gulp-autoprefixer"),
  browserSync = require("browser-sync"),
  cleanCSS = require("gulp-clean-css"),
  copyDepsYaml = "./copydeps.yml",
  cssImporter = require("node-sass-css-importer")({
    import_paths: ["./scss"],
  }),
  del = require("del"),
  eslint = require("gulp-eslint"),
  gulp = require("gulp"),
  log = require("fancy-log"),
  newer = require("gulp-newer"),
  path = require("path"),
  reload = browserSync.reload,
  rename = require("gulp-rename"),
  rollup = require("rollup"),
  rollupBabel = require("rollup-plugin-babel"),
  rollupCommonjs = require("rollup-plugin-commonjs"),
  rollupResolve = require("rollup-plugin-node-resolve"),
  rollupUglify = require("rollup-plugin-uglify").uglify,
  rollupTerser = require("rollup-plugin-terser").terser,
  sass = require("gulp-sass"),
  sourcemaps = require("gulp-sourcemaps"),
  gulpif = require("gulp-if"),
  data = require("gulp-data");
(themeYaml = "./theme.yml"),
  (fs = require("fs")),
  (year = new Date().getFullYear()),
  (yaml = require("yamljs"));

let copyDeps = yaml.load(copyDepsYaml);
let theme = yaml.load(themeYaml);

//Nunjuck render
const nunjucksRender = require("gulp-nunjucks-render");

const yargs = require("yargs");
// Check for --build flag
const PRODUCTION = !!yargs.argv.production;

const babelConfig = {
  presets: [
    [
      "@babel/env",
      {
        loose: true,
        modules: false,
        exclude: ["transform-typeof-symbol"],
      },
    ],
  ],
  plugins: ["@babel/plugin-proposal-object-rest-spread"],
  env: {
    test: {
      plugins: ["istanbul"],
    },
  },
  exclude: "node_modules/**", // Only transpile our source code
  externalHelpersWhitelist: [
    // Include only required helpers
    "defineProperties",
    "createClass",
    "inheritsLoose",
    "defineProperty",
    "objectSpread",
  ],
};

getPaths = () => {
  return {
    dist: "dest",
    html: {
      all: "src/html/**/*",
      html: "src/html/*.html",
      dataFile: "src/html/data/global.json",
      from: "src/html/*.html",
      folder: "src/html",
    },
    js: {
      all: "src/javascripts/**/*",
      bootstrap: {
        all: [
          "src/javascripts/bootstrap/alert.js",
          "src/javascripts/bootstrap/button.js",
          "src/javascripts/bootstrap/carousel.js",
          "src/javascripts/bootstrap/collapse.js",
          "src/javascripts/bootstrap/dropdown.js",
          "src/javascripts/bootstrap/modal.js",
          "src/javascripts/bootstrap/popover.js",
          "src/javascripts/bootstrap/scrollspy.js",
          "src/javascripts/bootstrap/tab.js",
          "src/javascripts/bootstrap/toast.js",
          "src/javascripts/bootstrap/tooltip.js",
          "src/javascripts/bootstrap/util.js",
        ],
        index: "src/javascripts/bootstrap/index.js",
      },
      mrare: {
        all: "src/javascripts/mrare/**/*.js",
        index: "src/javascripts/mrare/index.js",
      },
    },
    scss: {
      folder: "src/stylesheets",
      all: "src/stylesheets/**/*",
      root: "src/stylesheets/*.scss",
      include: "node_modules/bootstrap/scss",
      compatibility: ["last 2 versions", "ie >= 9"],
      themeScss: [
        "src/stylesheets/theme.scss",
        "!src/stylesheets/user.scss",
        "!src/stylesheets/user-variables.scss",
      ],
    },
    assets: {
      all: "src/assets/**/*",
      folder: "src/assets",
      allFolders: [
        "src/assets/css",
        "src/assets/img",
        "src/assets/fonts",
        "src/assets/video",
      ],
    },
    css: {
      folder: "src/assets/css",
    },
    fonts: {
      folder: "src/assets/fonts",
      all: "src/assets/fonts/*.*",
    },
    images: {
      folder: "src/assets/img",
      all: "src/assets/img/*.*",
    },
    videos: {
      folder: "src/assets/video",
      all: "src/assets/video/*.*",
    },
    copyDependencies: copyDeps,
  };
};
var paths = getPaths();

//If Build output to Public folder
if (PRODUCTION) {
  paths.dist = "public";
}

//DEFINE TASKS
//Delete the "dist" folder
//This happens every time a build start
gulp.task("clean:dist", function (done) {
  del.sync(paths.dist + "/**/*", {
    force: true,
  });
  done();
});

/**
 * HTML Task
 */
gulp.task("html", () => {
  // get data for nunjucks templates
  function getData(file) {
    const data = JSON.parse(fs.readFileSync(paths.html.dataFile, "utf8"));
    data.file = file;
    data.ENV = process.env.NODE_ENV;
    data.filename = path.basename(file.path);
    // data.headerComment = getHeaderComment("html");

    // active menu item for menu
    data.isActiveMenuItem = function (itemFile, item, filename) {
      if (itemFile === filename || (item.sub && item.sub[filename])) {
        return true;
      }

      let returnVal = false;

      if (item.sub) {
        Object.keys(item.sub).forEach((fileSub) => {
          const itemSub = item.sub[fileSub];

          if (fileSub === filename || (itemSub.sub && itemSub.sub[filename])) {
            returnVal = true;
          }
        });
      }

      return returnVal;
    };

    return data;
  }

  return gulp
    .src(paths.html.html)
    .pipe(data(getData))
    .pipe(
      nunjucksRender({
        path: paths.html.folder,
        envOptions: {
          watch: false,
        },
      })
    )
    .pipe(gulp.dest(paths.dist))
    .on("end", () => {
      reload({
        stream: true,
      });
    });
});

// Copy files out of the assets folder
// This task skips over the "img", "js", and "scss" folders, which are parsed separately

//SASS tasks
gulp.task("sass", () =>
  gulp
    .src(paths.scss.themeScss)
    .pipe(sourcemaps.init())
    .pipe(
      sass({
        includePaths: paths.scss.include,
        importer: [cssImporter],
      }).on("error", sass.logError)
    )
    .pipe(autoprefixer())
    .pipe(gulpif(!PRODUCTION, sourcemaps.write()))
    .pipe(
      gulpif(
        PRODUCTION,
        cleanCSS({
          compatibility: "ie9",
          level: {
            1: {
              specialComments: 0,
            },
          },
        })
      )
    )
    .pipe(gulp.dest(paths.dist + "/css"))
    .pipe(
      browserSync.stream({
        match: "**/theme*.css",
      })
    )
);

gulp.task("bootstrapjs", async (done) => {
  let fileDest = "bootstrap.js";
  const banner = `/*!
    * Bootstrap v${theme.bootstrap_version}
    * Copyright 2011-${year} The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
    * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
    */`;
  const external = ["jquery", "popper.js"];
  const plugins = [
    rollupBabel({
      exclude: "node_modules/**",
    }),
    rollupTerser(),
  ];
  const globals = {
    jquery: "jQuery", // Ensure we use jQuery which is always available even in noConflict mode
    "popper.js": "Popper",
  };

  const bundle = await rollup.rollup({
    input: paths.js.bootstrap.index,
    external,
    plugins,
  });

  await bundle.write({
    file: path.resolve(__dirname, `./${paths.dist}/js${path.sep}${fileDest}`),
    banner,
    globals,
    format: "umd",
    name: "bootstrap",
    sourcemap: true,
  });
  // Reload Browsersync clients
  reload();
  done();
});

gulp.task("mrarejs", async (done) => {
  gulp.src(paths.js.mrare.all).pipe(eslint()).pipe(eslint.format());

  let fileDest = "theme.js";
  const banner = `/*!
    * ${theme.name}
    * Copyright 2018-${year} Medium Rare (${theme.purchase_link})
    */`;
  const external = [...theme.scripts.external];
  const plugins = [
    rollupCommonjs(),
    rollupResolve({
      browser: true,
    }),
    rollupBabel(babelConfig),
    theme.minify_scripts === true
      ? rollupUglify({
          output: {
            comments: "/^!/",
          },
        })
      : null,
  ];
  const globals = theme.scripts.globals;

  const bundle = await rollup.rollup({
    input: paths.js.mrare.index,
    external,
    plugins,
    onwarn: function (warning) {
      // Skip certain warnings
      if (warning.code === "THIS_IS_UNDEFINED") {
        return;
      }
      // console.warn everything else
      console.warn(warning.message);
    },
  });

  await bundle.write({
    file: path.resolve(__dirname, `./${paths.dist}/js${path.sep}${fileDest}`),
    banner,
    globals,
    format: "umd",
    name: "theme",
    sourcemap: true,
    sourcemapFile: path.resolve(
      __dirname,
      `./${paths.dist}/assets/js${path.sep}${fileDest}.map`
    ),
  });
  // Reload Browsersync clients
  reload();
  done();
});

// Assets
gulp.task("copy-assets", function () {
  return gulp
    .src(paths.assets.all, {
      base: paths.assets.folder,
    })
    .pipe(newer(paths.dist))
    .pipe(gulp.dest(paths.dist))
    .pipe(
      reload({
        stream: true,
      })
    );
});

gulp.task("deps", async (done) => {
  await paths.copyDependencies.forEach(function (filesObj) {
    let files;
    if (typeof filesObj.files == "object") {
      files = filesObj.files.map((file) => {
        return `${filesObj.from}/${file}`;
      });
    } else {
      files = `${filesObj.from}/${filesObj.files}`;
    }

    gulp.src(files).pipe(gulp.dest(filesObj.to, { overwrite: true }));
  });
  done();
});

// watch files for changes and reload
gulp.task("serve", function (done) {
  browserSync({
    server: {
      baseDir: "./dest",
      index: "index.html",
    },
  });
  done();
});

gulp.task("watch", function (done) {
  // PAGES
  // Watch only .html pages as they can be recompiled individually
  gulp.watch(
    [paths.html.all],
    {
      cwd: "./",
    },
    gulp.series("html", function reloadPage(done) {
      reload();
      done();
    })
  );

  // SCSS
  // Any .scss file change will trigger a sass rebuild
  gulp.watch(
    [paths.scss.all],
    {
      cwd: "./",
    },
    gulp.series("sass")
  );

  // JS
  // Rebuild bootstrap js if files change
  gulp.watch(
    [...paths.js.bootstrap.all],
    {
      cwd: "./",
    },
    gulp.series("bootstrapjs")
  );

  // Rebuild mrare js if files change
  gulp.watch(
    [paths.js.mrare.all],
    {
      cwd: "./",
    },
    gulp.series("mrarejs")
  );

  // Rebuild mrare js if files change
  const assetsWatcher = gulp.watch(
    [paths.assets.all, ...paths.assets.allFolders],
    {
      cwd: "./",
    },
    gulp.series("copy-assets")
  );

  assetsWatcher.on("change", function (path) {
    console.log("File " + path + " was changed");
  });

  assetsWatcher.on("unlink", function (path) {
    const changedDistFile = path.resolve(
      paths.dist.assets,
      path.relative(path.resolve(paths.assets.folder), event.path)
    );
    console.log("File " + path + " was removed");
    del.sync(path);
  });

  done();
  // End watch task
});

gulp.task(
  "default",
  gulp.series(
    "clean:dist",
    "copy-assets",
    gulp.series("html", "sass", "bootstrapjs", "mrarejs"),
    gulp.series("serve", "watch")
  )
);

gulp.task(
  "build",
  gulp.series(
    "clean:dist",
    "copy-assets",
    gulp.series("html", "sass", "bootstrapjs", "mrarejs")
  )
);
