module ElmUi exposing (main)

import Browser
import Element exposing (Element)
import Element.Border
import Element.Input


main : Program () Model Msg
main =
    Browser.sandbox
        { init = init
        , view = Element.layout [] << view
        , update = update
        }


type alias Model =
    { count : Int
    , text : String
    }


init : Model
init =
    { count = 0
    , text = ""
    }


type Msg
    = Next
    | Input String


update : Msg -> Model -> Model
update msg model =
    case msg of
        Next ->
            { model | count = model.count + 1 }

        Input text ->
            { model | text = String.replace "!" "" text }


view : Model -> Element Msg
view model =
    Element.column [ Element.spacing 8, Element.width (Element.maximum 400 Element.fill) ]
        [ Element.text "Count: "
        , Element.text (String.fromInt model.count)
        , Element.Input.button [] { onPress = Just Next, label = Element.text "Nästa" }
        , Element.Input.multiline
            [ Element.width Element.fill
            , Element.padding 8
            , Element.Border.color (Element.rgb 0 0 0)
            ]
            { onChange = Input
            , text = model.text
            , placeholder = Nothing
            , label = Element.Input.labelAbove [] (Element.text "Text:")
            , spellcheck = True
            }
        , Element.paragraph [] [ Element.text model.text ]
        ]
