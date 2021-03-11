module SandboxSimple exposing (main)

import Browser
import Html
import Html.Attributes


main =
    Browser.sandbox
        { init = ()
        , view =
            always
                (Html.div
                    [ Html.Attributes.hidden True
                    , Html.Attributes.class ""
                    ]
                    [ Html.text "Hello" ]
                )
        , update = always identity
        }
